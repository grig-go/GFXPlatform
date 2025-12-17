import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Switch } from "./ui/switch";
import { Badge } from "./ui/badge";
import {
  Vote,
  TrendingUp,
  Trophy,
  Cloud,
  Newspaper,
  Bot,
  ImageIcon,
  GripVertical,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  School,
  Loader2,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner@2.0.3";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

export interface DashboardConfig {
  id: string;
  dbRecordId?: string; // Database record ID from customer_dashboards table
  label: string;
  icon: any;
  enabled: boolean;
  order: number;
}

interface DashboardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DEFAULT_DASHBOARDS: DashboardConfig[] = [
  { id: "election", label: "Elections", icon: Vote, enabled: true, order: 0 },
  { id: "finance", label: "Finance", icon: TrendingUp, enabled: true, order: 1 },
  { id: "sports", label: "Sports", icon: Trophy, enabled: true, order: 2 },
  { id: "weather", label: "Weather", icon: Cloud, enabled: true, order: 3 },
  { id: "news", label: "News", icon: Newspaper, enabled: true, order: 4 },
  { id: "school_closings", label: "School Closings", icon: School, enabled: true, order: 5 },
  { id: "agents", label: "Agents", icon: Bot, enabled: true, order: 6 },
  { id: "media_library", label: "Media Library", icon: ImageIcon, enabled: true, order: 7 },
];

const STORAGE_KEY = "nova_dashboard_config";

export function DashboardConfigDialog({ open, onOpenChange }: DashboardConfigDialogProps) {
  const [dashboards, setDashboards] = useState<DashboardConfig[]>(DEFAULT_DASHBOARDS);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch dashboard config from backend on mount
  useEffect(() => {
    if (open) {
      fetchDashboardConfig();
    }
  }, [open]);

  const fetchDashboardConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        getEdgeFunctionUrl('dashboard_config'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Fetched dashboard config:", data);

      if (data.ok && data.dashboards && data.dashboards.length > 0) {
        // Map backend data to frontend format
        const mapped = data.dashboards.map((dbDash: any) => {
          const defaultDash = DEFAULT_DASHBOARDS.find(d => d.id === dbDash.dashboard_id);
          return {
            id: dbDash.dashboard_id,
            dbRecordId: dbDash.id,
            label: defaultDash?.label || dbDash.dashboard_id,
            icon: defaultDash?.icon || Bot,
            enabled: dbDash.visible,
            order: dbDash.order_index,
          };
        });

        // Merge with defaults for any dashboards not in DB
        const allDashboards = DEFAULT_DASHBOARDS.map(defaultDash => {
          const existing = mapped.find((m: DashboardConfig) => m.id === defaultDash.id);
          return existing || defaultDash;
        });

        setDashboards(allDashboards.sort((a, b) => a.order - b.order));
      } else {
        // No backend data, use defaults
        console.log("⚠️ No backend config found, using defaults");
        setDashboards(DEFAULT_DASHBOARDS);
      }
    } catch (error) {
      console.error("❌ Error fetching dashboard config:", error);
      toast.error("Failed to load dashboard configuration", {
        description: "Using default settings",
      });
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const merged = DEFAULT_DASHBOARDS.map(defaultDash => {
            const stored = parsed.find((d: DashboardConfig) => d.id === defaultDash.id);
            return stored || defaultDash;
          });
          setDashboards(merged.sort((a, b) => a.order - b.order));
        } catch (e) {
          setDashboards(DEFAULT_DASHBOARDS);
        }
      } else {
        setDashboards(DEFAULT_DASHBOARDS);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (id: string) => {
    setDashboards(prev =>
      prev.map(dash =>
        dash.id === id ? { ...dash, enabled: !dash.enabled } : dash
      )
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      const newDashboards = [...dashboards];
      const draggedItem = newDashboards[draggedIndex];
      newDashboards.splice(draggedIndex, 1);
      newDashboards.splice(dragOverIndex, 0, draggedItem);
      
      // Update order property
      const updated = newDashboards.map((dash, idx) => ({ ...dash, order: idx }));
      setDashboards(updated);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Use bulk PATCH update
      const updates = dashboards
        .filter(dash => dash.dbRecordId) // Only update existing records
        .map(dash => ({
          id: dash.dbRecordId,
          visible: dash.enabled,
          order_index: dash.order,
        }));

      if (updates.length === 0) {
        // No backend records to update, save to localStorage as fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
        toast.success("Dashboard configuration saved locally!", {
          description: "Backend records not found. Configuration saved to browser.",
        });
        onOpenChange(false);
        setSaving(false);
        return;
      }

      const response = await fetch(
        getEdgeFunctionUrl('dashboard_config/update'),
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("✅ Saved dashboard config:", data);

      if (data.ok) {
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
        
        toast.success("Dashboard configuration saved!", {
          description: "Your changes have been applied successfully.",
        });
        
        // Dispatch custom event to trigger reload on home page
        window.dispatchEvent(new CustomEvent('dashboardConfigUpdated'));
        
        onOpenChange(false);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("❌ Error saving dashboard config:", error);
      
      // Fallback: save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
      
      toast.error("Failed to save to backend", {
        description: "Configuration saved locally instead.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDashboards(DEFAULT_DASHBOARDS);
    toast.info("Configuration reset to defaults");
  };

  const enabledCount = dashboards.filter(d => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            Dashboard Configuration
          </DialogTitle>
          <DialogDescription>
            Configure which dashboards are visible and their display order. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-600" />
            <span className="text-sm">
              <span className="font-semibold">{enabledCount}</span> enabled
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{dashboards.length - enabledCount}</span> hidden
            </span>
          </div>
          <Badge variant="outline" className="ml-auto">
            {dashboards.length} total
          </Badge>
        </div>

        {/* Dashboards List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading dashboard configuration...</p>
            </div>
          ) : (
            dashboards.map((dashboard, index) => {
              const Icon = dashboard.icon;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <motion.div
                  key={dashboard.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card
                    className={`
                      transition-all duration-200 cursor-move
                      ${isDragging ? "opacity-50 scale-95" : ""}
                      ${isDragOver ? "border-blue-500 border-2" : ""}
                      ${!dashboard.enabled ? "opacity-60" : ""}
                    `}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        {/* Drag Handle */}
                        <div className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors">
                          <GripVertical className="w-5 h-5" />
                        </div>

                        {/* Order Badge */}
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">{index + 1}</span>
                        </div>

                        {/* Icon */}
                        <div className={`p-2 rounded-lg ${
                          dashboard.enabled 
                            ? "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20" 
                            : "bg-muted"
                        }`}>
                          <Icon className={`w-5 h-5 ${
                            dashboard.enabled 
                              ? "text-blue-600 dark:text-blue-400" 
                              : "text-muted-foreground"
                          }`} />
                        </div>

                        {/* Label */}
                        <div className="flex-1">
                          <p className="font-medium">{dashboard.label}</p>
                          <p className="text-xs text-muted-foreground">
                            {dashboard.enabled ? "Visible on home" : "Hidden from home"}
                          </p>
                        </div>

                        {/* Status Badge */}
                        {dashboard.enabled ? (
                          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                            <Eye className="w-3 h-3 mr-1" />
                            Visible
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            <EyeOff className="w-3 h-3 mr-1" />
                            Hidden
                          </Badge>
                        )}

                        {/* Toggle Switch */}
                        <Switch
                          checked={dashboard.enabled}
                          onCheckedChange={() => handleToggle(dashboard.id)}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleReset}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Configuration
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Hook to get dashboard configuration
export function useDashboardConfig() {
  const [config, setConfig] = useState<DashboardConfig[]>(DEFAULT_DASHBOARDS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const merged = DEFAULT_DASHBOARDS.map(defaultDash => {
          const stored = parsed.find((d: DashboardConfig) => d.id === defaultDash.id);
          return stored || defaultDash;
        });
        setConfig(merged.sort((a, b) => a.order - b.order));
      } catch (error) {
        console.error("Failed to load dashboard config:", error);
      }
    }
  }, []);

  return config;
}