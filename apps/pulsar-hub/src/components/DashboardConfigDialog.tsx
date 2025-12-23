import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  Monitor,
  Video,
  Sliders,
  Zap,
  GripVertical,
  Save,
  RotateCcw,
  Eye,
  EyeOff,
  Loader2,
  LucideIcon,
  Database,
  Palette,
  Bot,
  ImageIcon,
  Vote,
  TrendingUp,
  Cloud,
  Trophy,
  School,
  Newspaper,
} from "lucide-react";
import { toast } from "sonner";
import { supabaseUrl, publicAnonKey } from "@/lib/supabase";

export interface DashboardConfig {
  id: string;
  dbRecordId?: string;
  label: string;
  icon: LucideIcon;
  iconBgColor: string;
  iconColor: string;
  enabled: boolean;
  order: number;
}

interface DashboardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// All dashboard options for Pulsar Hub (matches Nova's Pulsar Apps tab)
const DEFAULT_DASHBOARDS: DashboardConfig[] = [
  // Pulsar Apps (visible by default on Pulsar Hub)
  {
    id: "pulsar-gfx",
    label: "Pulsar GFX",
    icon: Monitor,
    iconBgColor: "bg-blue-500/10",
    iconColor: "text-blue-600",
    enabled: true,
    order: 0,
  },
  {
    id: "pulsar-vs",
    label: "Pulsar VS",
    icon: Video,
    iconBgColor: "bg-rose-500/10",
    iconColor: "text-rose-600",
    enabled: true,
    order: 1,
  },
  {
    id: "pulsar-mcr",
    label: "Pulsar MCR",
    icon: Sliders,
    iconBgColor: "bg-amber-500/10",
    iconColor: "text-amber-600",
    enabled: true,
    order: 2,
  },
  {
    id: "nexus",
    label: "Nexus",
    icon: Zap,
    iconBgColor: "bg-emerald-500/10",
    iconColor: "text-emerald-600",
    enabled: true,
    order: 3,
  },
  // Nova Home Categories (hidden by default on Pulsar Hub)
  {
    id: "data",
    label: "Data",
    icon: Database,
    iconBgColor: "bg-blue-500/10",
    iconColor: "text-blue-600",
    enabled: false,
    order: 4,
  },
  {
    id: "graphics",
    label: "Graphics",
    icon: Palette,
    iconBgColor: "bg-purple-500/10",
    iconColor: "text-purple-600",
    enabled: false,
    order: 5,
  },
  {
    id: "agents",
    label: "Agent",
    icon: Bot,
    iconBgColor: "bg-indigo-500/10",
    iconColor: "text-indigo-600",
    enabled: false,
    order: 6,
  },
  {
    id: "media_library",
    label: "Media Library",
    icon: ImageIcon,
    iconBgColor: "bg-pink-500/10",
    iconColor: "text-pink-600",
    enabled: false,
    order: 7,
  },
  // Data Sub-categories (hidden by default on Pulsar Hub)
  {
    id: "election",
    label: "Elections (sub category)",
    icon: Vote,
    iconBgColor: "bg-blue-500/10",
    iconColor: "text-blue-600",
    enabled: false,
    order: 8,
  },
  {
    id: "finance",
    label: "Finance (sub category)",
    icon: TrendingUp,
    iconBgColor: "bg-green-500/10",
    iconColor: "text-green-600",
    enabled: false,
    order: 9,
  },
  {
    id: "weather",
    label: "Weather (sub category)",
    icon: Cloud,
    iconBgColor: "bg-sky-500/10",
    iconColor: "text-sky-600",
    enabled: false,
    order: 10,
  },
  {
    id: "sports",
    label: "Sports (sub category)",
    icon: Trophy,
    iconBgColor: "bg-orange-500/10",
    iconColor: "text-orange-600",
    enabled: false,
    order: 11,
  },
  {
    id: "school_closings",
    label: "School Closings (sub category)",
    icon: School,
    iconBgColor: "bg-amber-500/10",
    iconColor: "text-amber-600",
    enabled: false,
    order: 12,
  },
  {
    id: "news",
    label: "News (sub category)",
    icon: Newspaper,
    iconBgColor: "bg-purple-500/10",
    iconColor: "text-purple-600",
    enabled: false,
    order: 13,
  },
];

const STORAGE_KEY = "pulsar_hub_dashboard_config";

export function DashboardConfigDialog({
  open,
  onOpenChange,
}: DashboardConfigDialogProps) {
  const { t } = useTranslation('dashboard');
  const { t: tCommon } = useTranslation('common');
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
        `${supabaseUrl}/functions/v1/dashboard_config?page=pulsar`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Fetched dashboard config:", data);

      if (data.ok && data.dashboards && data.dashboards.length > 0) {
        // Map backend data to frontend format
        const mapped = data.dashboards.map((dbDash: any) => {
          const defaultDash = DEFAULT_DASHBOARDS.find(
            (d) => d.id === dbDash.dashboard_id
          );
          return {
            id: dbDash.dashboard_id,
            dbRecordId: dbDash.id,
            label: defaultDash?.label || dbDash.dashboard_id,
            icon: defaultDash?.icon || Monitor,
            iconBgColor: defaultDash?.iconBgColor || "bg-slate-500/10",
            iconColor: defaultDash?.iconColor || "text-slate-600",
            enabled: dbDash.visible,
            order: dbDash.order_index,
          };
        });

        // Merge with defaults for any dashboards not in DB
        const allDashboards = DEFAULT_DASHBOARDS.map((defaultDash) => {
          const existing = mapped.find((m: DashboardConfig) => m.id === defaultDash.id);
          return existing || defaultDash;
        });

        setDashboards(allDashboards.sort((a, b) => a.order - b.order));
      } else {
        // No backend data, use defaults
        console.log("No backend config found, using defaults");
        setDashboards(DEFAULT_DASHBOARDS);
      }
    } catch (error) {
      console.error("Error fetching dashboard config:", error);
      toast.error(t('toast.loadFailed'), {
        description: t('toast.loadFailedDesc'),
      });
      // Fallback to localStorage
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const merged = DEFAULT_DASHBOARDS.map((defaultDash) => {
            const storedDash = parsed.find(
              (d: DashboardConfig) => d.id === defaultDash.id
            );
            return storedDash
              ? { ...defaultDash, enabled: storedDash.enabled, order: storedDash.order }
              : defaultDash;
          });
          setDashboards(merged.sort((a, b) => a.order - b.order));
        } catch {
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
    setDashboards((prev) =>
      prev.map((dash) =>
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
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
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
        .filter((dash) => dash.dbRecordId) // Only update existing records
        .map((dash) => ({
          id: dash.dbRecordId,
          visible: dash.enabled,
          order_index: dash.order,
        }));

      if (updates.length === 0) {
        // No backend records to update, save to localStorage as fallback
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));
        toast.success(t('toast.savedLocally'), {
          description: t('toast.savedLocallyDesc'),
        });
        onOpenChange(false);
        setSaving(false);
        return;
      }

      const response = await fetch(
        `${supabaseUrl}/functions/v1/dashboard_config/update`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save config: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Saved dashboard config:", data);

      if (data.ok) {
        // Also save to localStorage as backup
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));

        toast.success(t('toast.saved'), {
          description: t('toast.savedDesc'),
        });

        // Dispatch custom event to trigger reload on home page
        window.dispatchEvent(new CustomEvent("dashboardConfigUpdated"));

        onOpenChange(false);
      } else {
        throw new Error(data.error || "Unknown error");
      }
    } catch (error) {
      console.error("Error saving dashboard config:", error);

      // Fallback: save to localStorage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dashboards));

      toast.error(t('toast.backendFailed'), {
        description: t('toast.backendFailedDesc'),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setDashboards(DEFAULT_DASHBOARDS);
    toast.info(t('toast.reset'));
  };

  const enabledCount = dashboards.filter((d) => d.enabled).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-violet-600 to-purple-500 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            {t('title')}
          </DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-green-600" />
            <span className="text-sm">
              <span className="font-semibold">{enabledCount}</span> {t('stats.enabled')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <EyeOff className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              <span className="font-semibold">{dashboards.length - enabledCount}</span>{" "}
              {t('stats.hidden')}
            </span>
          </div>
          <Badge variant="outline" className="ms-auto">
            {dashboards.length} {t('stats.total')}
          </Badge>
        </div>

        {/* Dashboards List */}
        <div className="flex-1 overflow-y-auto space-y-2 pe-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">
                {t('loading')}
              </p>
            </div>
          ) : (
            dashboards.map((dashboard, index) => {
              const Icon = dashboard.icon;
              const isDragging = draggedIndex === index;
              const isDragOver = dragOverIndex === index;

              return (
                <Card
                  key={dashboard.id}
                  className={`
                    transition-all duration-200 cursor-move
                    ${isDragging ? "opacity-50 scale-95" : ""}
                    ${isDragOver ? "border-primary border-2" : ""}
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
                        <span className="text-sm font-semibold text-primary">
                          {index + 1}
                        </span>
                      </div>

                      {/* Icon */}
                      <div
                        className={`p-2 rounded-lg ${dashboard.iconBgColor}`}
                      >
                        <Icon className={`w-5 h-5 ${dashboard.iconColor}`} />
                      </div>

                      {/* Label */}
                      <div className="flex-1">
                        <p className="font-medium">{dashboard.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {dashboard.enabled ? t('status.visibleOnHome') : t('status.hiddenFromHome')}
                        </p>
                      </div>

                      {/* Status Badge */}
                      {dashboard.enabled ? (
                        <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                          <Eye className="w-3 h-3 me-1" />
                          {tCommon('status.visible')}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="w-3 h-3 me-1" />
                          {tCommon('status.hidden')}
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
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="w-4 h-4" />
            {t('buttons.resetToDefaults')}
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {tCommon('buttons.cancel')}
            </Button>
            <Button onClick={handleSave} className="gap-2" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {tCommon('status.saving')}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {t('buttons.saveConfiguration')}
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `${supabaseUrl}/functions/v1/dashboard_config?page=pulsar`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.statusText}`);
        }

        const data = await response.json();
        console.log("📊 useDashboardConfig: Fetched pulsar config:", data);

        if (data.ok && data.dashboards && data.dashboards.length > 0) {
          // Map backend data to frontend format
          const mapped = data.dashboards.map((dbDash: any) => {
            const defaultDash = DEFAULT_DASHBOARDS.find(
              (d) => d.id === dbDash.dashboard_id
            );
            return {
              id: dbDash.dashboard_id,
              dbRecordId: dbDash.id,
              label: defaultDash?.label || dbDash.name || dbDash.dashboard_id,
              icon: defaultDash?.icon || Monitor,
              iconBgColor: defaultDash?.iconBgColor || "bg-slate-500/10",
              iconColor: defaultDash?.iconColor || "text-slate-600",
              enabled: dbDash.visible,
              order: dbDash.order_index,
            };
          });

          // Filter to only include Pulsar apps (not Nova categories or sub-categories)
          const pulsarAppsOnly = mapped.filter((m: DashboardConfig) =>
            DEFAULT_DASHBOARDS.some(d => d.id === m.id)
          );

          setConfig(pulsarAppsOnly.sort((a: DashboardConfig, b: DashboardConfig) => a.order - b.order));

          // Also save to localStorage as backup
          localStorage.setItem(STORAGE_KEY, JSON.stringify(pulsarAppsOnly));
        } else {
          // No backend data, use defaults
          console.log("No backend config found, using defaults");
          setConfig(DEFAULT_DASHBOARDS);
        }
      } catch (error) {
        console.error("Error fetching dashboard config:", error);
        // Fallback to localStorage
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            const merged = DEFAULT_DASHBOARDS.map((defaultDash) => {
              const storedDash = parsed.find(
                (d: DashboardConfig) => d.id === defaultDash.id
              );
              return storedDash
                ? { ...defaultDash, enabled: storedDash.enabled, order: storedDash.order }
                : defaultDash;
            });
            setConfig(merged.sort((a, b) => a.order - b.order));
          } catch {
            setConfig(DEFAULT_DASHBOARDS);
          }
        } else {
          setConfig(DEFAULT_DASHBOARDS);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  return config;
}

export { DEFAULT_DASHBOARDS };
