import { useState, useEffect } from "react";
import { Monitor, Video, Sliders, Zap, LucideIcon } from "lucide-react";
import { AppCard } from "@/components/AppCard";
import { useDashboardConfig, DEFAULT_DASHBOARDS, DashboardConfig } from "@/components/DashboardConfigDialog";
import { cn } from "@/lib/utils";

// App URLs - these could come from env vars or database
const APP_URLS: Record<string, string> = {
  "pulsar-gfx": import.meta.env.VITE_PULSAR_GFX_URL || "http://localhost:3001",
  "pulsar-vs": import.meta.env.VITE_PULSAR_VS_URL || "http://localhost:3004",
  "pulsar-mcr": import.meta.env.VITE_PULSAR_MCR_URL || "http://localhost:3006",
  "nexus": import.meta.env.VITE_NEXUS_URL || "http://localhost:3002",
};

// App descriptions
const APP_DESCRIPTIONS: Record<string, string> = {
  "pulsar-gfx": "AI-powered graphics content creation system for broadcast and live production.",
  "pulsar-vs": "AI-powered virtual environment and LED screen content creation and management.",
  "pulsar-mcr": "Advanced content scheduling, management, and automation for broadcast workflows.",
  "nexus": "Operations management and venue monitoring dashboard with real-time system status.",
};

// Icon mapping
const ICON_MAP: Record<string, LucideIcon> = {
  "pulsar-gfx": Monitor,
  "pulsar-vs": Video,
  "pulsar-mcr": Sliders,
  "nexus": Zap,
};

// Color mapping for Nova-style icons (bg-color/10 and text-color-600)
const COLOR_MAP: Record<string, { bgColor: string; iconColor: string }> = {
  "pulsar-gfx": { bgColor: "bg-blue-500/10", iconColor: "text-blue-600" },
  "pulsar-vs": { bgColor: "bg-rose-500/10", iconColor: "text-rose-600" },
  "pulsar-mcr": { bgColor: "bg-amber-500/10", iconColor: "text-amber-600" },
  "nexus": { bgColor: "bg-emerald-500/10", iconColor: "text-emerald-600" },
};

export function HomePage() {
  const storedConfig = useDashboardConfig();
  const [dashboards, setDashboards] = useState<DashboardConfig[]>(DEFAULT_DASHBOARDS);

  // Update dashboards when config changes
  useEffect(() => {
    setDashboards(storedConfig);
  }, [storedConfig]);

  // Listen for config updates
  useEffect(() => {
    const handleConfigUpdate = () => {
      // Re-read from localStorage
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
          // Ignore parse errors
        }
      }
    };

    window.addEventListener("dashboardConfigUpdated", handleConfigUpdate);
    return () => window.removeEventListener("dashboardConfigUpdated", handleConfigUpdate);
  }, []);

  const enabledDashboards = dashboards.filter((d) => d.enabled);
  const cardCount = enabledDashboards.length;

  // Dynamic grid layout based on card count (matching Nova Dashboard)
  const getGridClass = () => {
    if (cardCount === 1) return "grid-cols-1 max-w-lg";
    if (cardCount === 2) return "grid-cols-1 md:grid-cols-2 max-w-4xl";
    if (cardCount === 3) return "grid-cols-1 md:grid-cols-3 max-w-5xl";
    return "grid-cols-1 md:grid-cols-2 max-w-4xl";
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
            Pulsar Hub
          </h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            AI-powered graphics and production control suite. Launch applications and monitor system status.
          </p>
        </div>

        {/* App Grid - Dynamic layout based on card count */}
        <div className={cn("grid gap-4 mx-auto", getGridClass())}>
          {enabledDashboards.map((dashboard) => {
            const colors = COLOR_MAP[dashboard.id] || { bgColor: "bg-slate-500/10", iconColor: "text-slate-600" };
            return (
              <AppCard
                key={dashboard.id}
                id={dashboard.id}
                label={dashboard.label}
                description={APP_DESCRIPTIONS[dashboard.id] || ""}
                icon={ICON_MAP[dashboard.id] || Monitor}
                iconBgColor={colors.bgColor}
                iconColor={colors.iconColor}
                url={APP_URLS[dashboard.id]}
                enabled={dashboard.enabled}
              />
            );
          })}
        </div>

        {/* Empty State */}
        {enabledDashboards.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Monitor className="w-8 h-8 text-slate-400" />
            </div>
            <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-300 mb-2">
              No apps visible
            </h2>
            <p className="text-slate-500 dark:text-slate-400">
              Use Tools → Configure Dashboard to enable apps.
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
            Emergent Solutions
          </a>
          {" "}• Pulsar Suite
        </p>
      </div>
    </div>
  );
}
