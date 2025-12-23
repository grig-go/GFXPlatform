import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Monitor, Video, Sliders, Zap, LucideIcon, Loader2, Database, Palette, Bot, ImageIcon, Vote, TrendingUp, Cloud, Trophy, School, Newspaper } from "lucide-react";
import { AppCard } from "@/components/AppCard";
import { DEFAULT_DASHBOARDS, DashboardConfig } from "@/components/DashboardConfigDialog";
import { cn } from "@/lib/utils";
import { supabaseUrl, publicAnonKey } from "@/lib/supabase";

// App URLs from environment variables (Pulsar apps + Nova app for Nova categories)
const NOVA_URL = import.meta.env.VITE_NOVA_URL || "http://localhost:3009";
const APP_URLS: Record<string, string> = {
  // Pulsar Apps
  "pulsar-gfx": import.meta.env.VITE_PULSAR_GFX_URL || "http://localhost:3001",
  "pulsar-vs": import.meta.env.VITE_PULSAR_VS_URL || "http://localhost:3004",
  "pulsar-mcr": import.meta.env.VITE_PULSAR_MCR_URL || "http://localhost:3006",
  "nexus": import.meta.env.VITE_NEXUS_URL || "http://localhost:3002",
  // Nova categories - link to Nova app
  "data": NOVA_URL,
  "graphics": NOVA_URL,
  "agents": NOVA_URL,
  "media_library": NOVA_URL,
  // Data sub-categories - link to Nova app
  "election": NOVA_URL,
  "finance": NOVA_URL,
  "weather": NOVA_URL,
  "sports": NOVA_URL,
  "school_closings": NOVA_URL,
  "news": NOVA_URL,
};

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  // Pulsar Apps
  "pulsar-gfx": Monitor,
  "pulsar-vs": Video,
  "pulsar-mcr": Sliders,
  "nexus": Zap,
  // Nova categories
  "data": Database,
  "graphics": Palette,
  "agents": Bot,
  "media_library": ImageIcon,
  // Data sub-categories
  "election": Vote,
  "finance": TrendingUp,
  "weather": Cloud,
  "sports": Trophy,
  "school_closings": School,
  "news": Newspaper,
};

// Color mapping for Nova-style icons (bg-color/10 and text-color-600)
const COLOR_MAP: Record<string, { bgColor: string; iconColor: string }> = {
  // Pulsar Apps
  "pulsar-gfx": { bgColor: "bg-blue-500/10", iconColor: "text-blue-600" },
  "pulsar-vs": { bgColor: "bg-rose-500/10", iconColor: "text-rose-600" },
  "pulsar-mcr": { bgColor: "bg-amber-500/10", iconColor: "text-amber-600" },
  "nexus": { bgColor: "bg-emerald-500/10", iconColor: "text-emerald-600" },
  // Nova categories
  "data": { bgColor: "bg-blue-500/10", iconColor: "text-blue-600" },
  "graphics": { bgColor: "bg-purple-500/10", iconColor: "text-purple-600" },
  "agents": { bgColor: "bg-indigo-500/10", iconColor: "text-indigo-600" },
  "media_library": { bgColor: "bg-pink-500/10", iconColor: "text-pink-600" },
  // Data sub-categories
  "election": { bgColor: "bg-blue-500/10", iconColor: "text-blue-600" },
  "finance": { bgColor: "bg-green-500/10", iconColor: "text-green-600" },
  "weather": { bgColor: "bg-sky-500/10", iconColor: "text-sky-600" },
  "sports": { bgColor: "bg-orange-500/10", iconColor: "text-orange-600" },
  "school_closings": { bgColor: "bg-amber-500/10", iconColor: "text-amber-600" },
  "news": { bgColor: "bg-purple-500/10", iconColor: "text-purple-600" },
};

export function HomePage() {
  const { t } = useTranslation('home');
  const [dashboards, setDashboards] = useState<DashboardConfig[]>(DEFAULT_DASHBOARDS);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard config from backend
  const fetchDashboardConfig = useCallback(async () => {
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
      console.log("📊 HomePage: Fetched pulsar config:", data);

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

        setDashboards(pulsarAppsOnly.sort((a: DashboardConfig, b: DashboardConfig) => a.order - b.order));

        // Also save to localStorage as backup
        localStorage.setItem("pulsar_hub_dashboard_config", JSON.stringify(pulsarAppsOnly));
      } else {
        // No backend data, use defaults
        console.log("No backend config found, using defaults");
        setDashboards(DEFAULT_DASHBOARDS);
      }
    } catch (error) {
      console.error("Error fetching dashboard config:", error);
      // Fallback to localStorage
      const stored = localStorage.getItem("pulsar_hub_dashboard_config");
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
  }, []);

  // Fetch on mount
  useEffect(() => {
    fetchDashboardConfig();
  }, [fetchDashboardConfig]);

  // Listen for config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      console.log("📊 Dashboard config updated, refetching...");
      fetchDashboardConfig();
    };

    window.addEventListener("dashboardConfigUpdated", handleConfigUpdate);
    return () => window.removeEventListener("dashboardConfigUpdated", handleConfigUpdate);
  }, [fetchDashboardConfig]);

  const enabledDashboards = dashboards.filter((d) => d.enabled);
  const cardCount = enabledDashboards.length;

  // Dynamic grid layout based on card count (matching Nova Dashboard)
  const getGridClass = () => {
    if (cardCount === 1) return "grid-cols-1 max-w-lg";
    if (cardCount === 2) return "grid-cols-1 md:grid-cols-2 max-w-4xl";
    if (cardCount === 3) return "grid-cols-1 md:grid-cols-3 max-w-5xl";
    if (cardCount <= 4) return "grid-cols-1 md:grid-cols-2 max-w-4xl";
    // For 5+ cards, use 2 columns on medium screens
    return "grid-cols-1 md:grid-cols-2 lg:grid-cols-3 max-w-6xl";
  };

  // Get app description from translations
  const getAppDescription = (appId: string): string => {
    return t(`appDescriptions.${appId}`, { defaultValue: '' });
  };

  return (
    <div className="min-h-[calc(100vh-60px)] bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header with animated icon */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-14 h-14 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center animate-jiggle shadow-sm">
              <span className="text-white font-bold text-2xl">P</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-3">
            {t('title')}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {t('subtitle')}
          </p>
        </div>

        {/* App Grid - Dynamic layout based on card count */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-500 mb-4" />
            <p className="text-slate-500 dark:text-slate-400">Loading applications...</p>
          </div>
        ) : (
          <div className={cn("grid gap-4 mx-auto", getGridClass())}>
            {enabledDashboards.map((dashboard) => {
              const colors = COLOR_MAP[dashboard.id] || { bgColor: "bg-slate-500/10", iconColor: "text-slate-600" };
              return (
                <AppCard
                  key={dashboard.id}
                  id={dashboard.id}
                  label={dashboard.label}
                  description={getAppDescription(dashboard.id)}
                  icon={ICON_MAP[dashboard.id] || Monitor}
                  iconBgColor={colors.bgColor}
                  iconColor={colors.iconColor}
                  url={APP_URLS[dashboard.id]}
                  enabled={dashboard.enabled}
                />
              );
            })}
          </div>
        )}

        {/* Empty State */}
        {!loading && enabledDashboards.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              {t('emptyState.title')}
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              {t('emptyState.message')}
            </p>
          </div>
        )}

      </div>

      {/* Footer - sticky to bottom */}
      <div className="fixed bottom-0 left-0 right-0 py-4 text-center text-sm text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800">
        <p>
          <a
            href="https://www.emergent.solutions/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {t('footer.company')}
          </a>
          {" "}• {t('footer.product')}
        </p>
      </div>
    </div>
  );
}
