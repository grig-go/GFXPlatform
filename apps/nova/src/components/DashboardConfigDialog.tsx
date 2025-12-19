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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Label } from "./ui/label";
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
  Database,
  Palette,
  Star,
  Home,
  LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner@2.0.3";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

export interface DashboardConfig {
  id: string;
  dbRecordId?: string;
  label: string;
  icon: any;
  enabled: boolean;
  order: number;
  isDefault?: boolean;
}

interface DashboardConfigDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Home page categories (main + sub-categories)
const HOME_CATEGORIES: DashboardConfig[] = [
  { id: "data", label: "Data", icon: Database, enabled: true, order: 0 },
  { id: "graphics", label: "Graphics", icon: Palette, enabled: true, order: 1 },
  { id: "agents", label: "Agent", icon: Bot, enabled: true, order: 2 },
  { id: "media_library", label: "Media Library", icon: ImageIcon, enabled: true, order: 3 },
  // Sub-categories (off by default)
  { id: "election", label: "Elections (sub category)", icon: Vote, enabled: false, order: 4 },
  { id: "finance", label: "Finance (sub category)", icon: TrendingUp, enabled: false, order: 5 },
  { id: "weather", label: "Weather (sub category)", icon: Cloud, enabled: false, order: 6 },
  { id: "sports", label: "Sports (sub category)", icon: Trophy, enabled: false, order: 7 },
  { id: "school_closings", label: "School Closings (sub category)", icon: School, enabled: false, order: 8 },
  { id: "news", label: "News (sub category)", icon: Newspaper, enabled: false, order: 9 },
];

// Data dashboards
const DATA_DASHBOARDS: DashboardConfig[] = [
  { id: "election", label: "Elections", icon: Vote, enabled: true, order: 0, isDefault: true },
  { id: "finance", label: "Finance", icon: TrendingUp, enabled: true, order: 1 },
  { id: "weather", label: "Weather", icon: Cloud, enabled: true, order: 2 },
  { id: "sports", label: "Sports", icon: Trophy, enabled: true, order: 3 },
  { id: "school_closings", label: "School Closings", icon: School, enabled: true, order: 4 },
  { id: "news", label: "News", icon: Newspaper, enabled: true, order: 5 },
];

const STORAGE_KEY = "nova_dashboard_config";
const HOME_STORAGE_KEY = "nova_home_config";
const DEFAULT_DASHBOARD_KEY = "nova_default_dashboard";

export function DashboardConfigDialog({ open, onOpenChange }: DashboardConfigDialogProps) {
  const [activeTab, setActiveTab] = useState<"home" | "data">("home");
  const [homeCategories, setHomeCategories] = useState<DashboardConfig[]>(HOME_CATEGORIES);
  const [dataDashboards, setDataDashboards] = useState<DashboardConfig[]>(DATA_DASHBOARDS);
  const [defaultDashboard, setDefaultDashboard] = useState<string>("election");
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch config on mount
  useEffect(() => {
    if (open) {
      fetchConfig();
    }
  }, [open]);

  const fetchConfig = async () => {
    try {
      setLoading(true);

      // Fetch home config
      const homeResponse = await fetch(
        getEdgeFunctionUrl('dashboard_config?page=home'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      // Fetch data config
      const dataResponse = await fetch(
        getEdgeFunctionUrl('dashboard_config?page=data'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      const homeData = await homeResponse.json();
      const dataData = await dataResponse.json();

      console.log("📊 Fetched home config:", homeData);
      console.log("📊 Fetched data config:", dataData);

      // Process home categories
      if (homeData.ok && homeData.dashboards?.length > 0) {
        const mapped = homeData.dashboards.map((d: any) => {
          const defaultCat = HOME_CATEGORIES.find(c => c.id === d.dashboard_id);
          return {
            id: d.dashboard_id,
            dbRecordId: d.id,
            label: defaultCat?.label || d.name || d.dashboard_id,
            icon: defaultCat?.icon || Database,
            enabled: d.visible,
            order: d.order_index,
          };
        });
        setHomeCategories(mapped.sort((a: DashboardConfig, b: DashboardConfig) => a.order - b.order));
      }

      // Process data dashboards
      if (dataData.ok && dataData.dashboards?.length > 0) {
        const mapped = dataData.dashboards.map((d: any) => {
          const defaultDash = DATA_DASHBOARDS.find(dash => dash.id === d.dashboard_id);
          return {
            id: d.dashboard_id,
            dbRecordId: d.id,
            label: defaultDash?.label || d.name || d.dashboard_id,
            icon: defaultDash?.icon || Bot,
            enabled: d.visible,
            order: d.order_index,
            isDefault: d.is_default || false,
          };
        });

        const sorted = mapped.sort((a: DashboardConfig, b: DashboardConfig) => a.order - b.order);
        setDataDashboards(sorted);

        // Find default dashboard
        const defaultDash = sorted.find((d: DashboardConfig) => d.isDefault);
        if (defaultDash) {
          setDefaultDashboard(defaultDash.id);
        }
      }

    } catch (error) {
      console.error("❌ Error fetching config:", error);
      toast.error("Failed to load configuration");
      // Load from localStorage as fallback
      loadFromLocalStorage();
    } finally {
      setLoading(false);
    }
  };

  const loadFromLocalStorage = () => {
    const homeStored = localStorage.getItem(HOME_STORAGE_KEY);
    const dataStored = localStorage.getItem(STORAGE_KEY);
    const defaultStored = localStorage.getItem(DEFAULT_DASHBOARD_KEY);

    if (homeStored) {
      try {
        const parsed = JSON.parse(homeStored);
        const merged = HOME_CATEGORIES.map(defaultCat => {
          const stored = parsed.find((d: DashboardConfig) => d.id === defaultCat.id);
          return stored ? { ...defaultCat, ...stored } : defaultCat;
        });
        setHomeCategories(merged.sort((a, b) => a.order - b.order));
      } catch (e) {
        setHomeCategories(HOME_CATEGORIES);
      }
    }

    if (dataStored) {
      try {
        const parsed = JSON.parse(dataStored);
        const merged = DATA_DASHBOARDS.map(defaultDash => {
          const stored = parsed.find((d: DashboardConfig) => d.id === defaultDash.id);
          return stored ? { ...defaultDash, ...stored } : defaultDash;
        });
        setDataDashboards(merged.sort((a, b) => a.order - b.order));
      } catch (e) {
        setDataDashboards(DATA_DASHBOARDS);
      }
    }

    if (defaultStored) {
      setDefaultDashboard(defaultStored);
    }
  };

  const handleToggle = (id: string, type: "home" | "data") => {
    if (type === "home") {
      setHomeCategories(prev =>
        prev.map(cat =>
          cat.id === id ? { ...cat, enabled: !cat.enabled } : cat
        )
      );
    } else {
      setDataDashboards(prev =>
        prev.map(dash =>
          dash.id === id ? { ...dash, enabled: !dash.enabled } : dash
        )
      );
    }
  };

  const handleDefaultChange = (dashboardId: string) => {
    setDefaultDashboard(dashboardId);
    setDataDashboards(prev =>
      prev.map(dash => ({
        ...dash,
        isDefault: dash.id === dashboardId,
      }))
    );
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = (type: "home" | "data") => {
    if (draggedIndex !== null && dragOverIndex !== null && draggedIndex !== dragOverIndex) {
      if (type === "home") {
        const newItems = [...homeCategories];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(dragOverIndex, 0, draggedItem);
        const updated = newItems.map((item, idx) => ({ ...item, order: idx }));
        setHomeCategories(updated);
      } else {
        const newItems = [...dataDashboards];
        const draggedItem = newItems[draggedIndex];
        newItems.splice(draggedIndex, 1);
        newItems.splice(dragOverIndex, 0, draggedItem);
        const updated = newItems.map((item, idx) => ({ ...item, order: idx }));
        setDataDashboards(updated);
      }
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save HOME categories to backend (include virtual IDs - backend handles creating records)
      const homeUpdates = homeCategories
        .filter(cat => cat.dbRecordId) // Include all with dbRecordId (including virtual home-* IDs)
        .map(cat => ({
          id: cat.dbRecordId,
          visible: cat.enabled,
          order_index: cat.order,
        }));

      if (homeUpdates.length > 0) {
        console.log("📤 Sending home updates:", homeUpdates);
        const homeResponse = await fetch(
          getEdgeFunctionUrl('dashboard_config/update'),
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(homeUpdates),
          }
        );

        const homeData = await homeResponse.json();
        console.log("✅ Saved home config:", homeData);
      }

      // Save DATA dashboards to backend (include virtual IDs - backend handles creating records)
      const dataUpdates = dataDashboards
        .filter(dash => dash.dbRecordId) // Include all with dbRecordId (including virtual data-* IDs)
        .map(dash => ({
          id: dash.dbRecordId,
          visible: dash.enabled,
          order_index: dash.order,
          is_default: dash.id === defaultDashboard,
        }));

      if (dataUpdates.length > 0) {
        const response = await fetch(
          getEdgeFunctionUrl('dashboard_config/update'),
          {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(dataUpdates),
          }
        );

        const data = await response.json();
        console.log("✅ Saved data config:", data);
      }

      // Save to localStorage as backup
      localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(homeCategories));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataDashboards));
      localStorage.setItem(DEFAULT_DASHBOARD_KEY, defaultDashboard);

      toast.success("Configuration saved!", {
        description: "Your dashboard settings have been updated.",
      });

      // Dispatch event to trigger reload
      window.dispatchEvent(new CustomEvent('dashboardConfigUpdated'));

      onOpenChange(false);

    } catch (error) {
      console.error("❌ Error saving config:", error);
      // Save to localStorage anyway
      localStorage.setItem(HOME_STORAGE_KEY, JSON.stringify(homeCategories));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataDashboards));
      localStorage.setItem(DEFAULT_DASHBOARD_KEY, defaultDashboard);

      toast.error("Failed to save to server", {
        description: "Configuration saved locally instead.",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    if (activeTab === "home") {
      setHomeCategories(HOME_CATEGORIES);
    } else {
      setDataDashboards(DATA_DASHBOARDS);
      setDefaultDashboard("election");
    }
    toast.info("Reset to defaults");
  };

  const homeEnabledCount = homeCategories.filter(c => c.enabled).length;
  const dataEnabledCount = dataDashboards.filter(d => d.enabled).length;

  const renderDashboardList = (
    items: DashboardConfig[],
    type: "home" | "data"
  ) => (
    <div className="flex-1 overflow-y-auto space-y-2 pr-2">
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading configuration...</p>
        </div>
      ) : (
        items.map((item, index) => {
          const Icon = item.icon;
          const isDragging = draggedIndex === index;
          const isDragOver = dragOverIndex === index;

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card
                className={`
                  transition-all duration-200 cursor-move
                  ${isDragging ? "opacity-50 scale-95" : ""}
                  ${isDragOver ? "border-blue-500 border-2" : ""}
                  ${!item.enabled ? "opacity-60" : ""}
                `}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={() => handleDragEnd(type)}
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
                      item.enabled
                        ? "bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20"
                        : "bg-muted"
                    }`}>
                      <Icon className={`w-5 h-5 ${
                        item.enabled
                          ? "text-blue-600 dark:text-blue-400"
                          : "text-muted-foreground"
                      }`} />
                    </div>

                    {/* Label */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{item.label}</p>
                        {type === "data" && item.id === defaultDashboard && (
                          <Badge variant="secondary" className="text-xs">
                            <Star className="w-3 h-3 mr-1 fill-yellow-500 text-yellow-500" />
                            Default
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {item.enabled ? "Visible" : "Hidden"}
                      </p>
                    </div>

                    {/* Default selector for data dashboards */}
                    {type === "data" && item.enabled && (
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          id={`default-${item.id}`}
                          name="defaultDashboard"
                          checked={item.id === defaultDashboard}
                          onChange={() => handleDefaultChange(item.id)}
                          className="w-4 h-4 text-primary"
                        />
                        <label htmlFor={`default-${item.id}`} className="text-xs text-muted-foreground">
                          Default
                        </label>
                      </div>
                    )}

                    {/* Status Badge */}
                    {item.enabled ? (
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
                      checked={item.enabled}
                      onCheckedChange={() => handleToggle(item.id, type)}
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })
      )}
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
              <Eye className="w-5 h-5 text-white" />
            </div>
            Dashboard Configuration
          </DialogTitle>
          <DialogDescription>
            Configure your home page categories and data dashboards. Drag to reorder.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "home" | "data")} className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="home" className="gap-2">
              <Home className="w-4 h-4" />
              Home Categories
            </TabsTrigger>
            <TabsTrigger value="data" className="gap-2">
              <LayoutGrid className="w-4 h-4" />
              Data Dashboards
            </TabsTrigger>
          </TabsList>

          <TabsContent value="home" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-sm">
                  <span className="font-semibold">{homeEnabledCount}</span> visible
                </span>
              </div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-semibold">{homeCategories.length - homeEnabledCount}</span> hidden
                </span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {homeCategories.length} total
              </Badge>
            </div>

            {renderDashboardList(homeCategories, "home")}
          </TabsContent>

          <TabsContent value="data" className="flex-1 flex flex-col overflow-hidden mt-4">
            {/* Stats Bar */}
            <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg mb-4">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-green-600" />
                <span className="text-sm">
                  <span className="font-semibold">{dataEnabledCount}</span> visible
                </span>
              </div>
              <div className="flex items-center gap-2">
                <EyeOff className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">
                  <span className="font-semibold">{dataDashboards.length - dataEnabledCount}</span> hidden
                </span>
              </div>
              <Badge variant="outline" className="ml-auto">
                {dataDashboards.length} total
              </Badge>
            </div>

            <p className="text-sm text-muted-foreground mb-3">
              Select which dashboard opens when clicking "Data" from the home page:
            </p>

            {renderDashboardList(dataDashboards, "data")}
          </TabsContent>
        </Tabs>

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
  const [config, setConfig] = useState<DashboardConfig[]>(DATA_DASHBOARDS);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        const merged = DATA_DASHBOARDS.map(defaultDash => {
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
