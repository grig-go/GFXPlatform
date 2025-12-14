import { useTranslation } from "react-i18next";
import { Button } from "./ui/button";
import { Search } from "lucide-react";
import { Input } from "./ui/input";

interface NavigationToolbarProps {
  currentView?: "main" | "zone" | "devices" | "workflows" | "timeline" | "logs-alerts";
  onNavigate?: (view: "main" | "zone" | "devices" | "workflows" | "timeline" | "logs-alerts") => void;
}

type NavItemKey = "dashboard" | "systemsMap" | "zones" | "devices" | "workflows" | "timeline" | "logsAlerts" | "aiInsights";

const navItems: { id: string; key: NavItemKey; view?: "main" | "zone" | "devices" | "workflows" | "timeline" | "logs-alerts" }[] = [
  { id: "dashboard", key: "dashboard", view: "main" },
  { id: "systems-map", key: "systemsMap" },
  { id: "zones", key: "zones", view: "zone" },
  { id: "devices", key: "devices", view: "devices" },
  { id: "rules", key: "workflows", view: "workflows" },
  { id: "timeline", key: "timeline", view: "timeline" },
  { id: "logs-alerts", key: "logsAlerts", view: "logs-alerts" },
  { id: "ai-insights", key: "aiInsights" },
];

export function NavigationToolbar({ currentView = "main", onNavigate }: NavigationToolbarProps = {}) {
  const { t } = useTranslation('nav');

  return (
    <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-1">
            {navItems.map((item) => {
              const isActive = item.view === currentView;
              // Hide Systems Map and AI Insights buttons
              if (item.id === "systems-map" || item.id === "ai-insights") return null;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  size="sm"
                  onClick={() => item.view && onNavigate?.(item.view)}
                  className={
                    isActive
                      ? "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:hover:bg-slate-200 dark:text-slate-900 transition-all duration-200 scale-105 shadow-md"
                      : "text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105 active:scale-95"
                  }
                >
                  {t(`navigation.${item.key}`)}
                </Button>
              );
            })}
          </div>

          {/* Global search */}
          <div className="relative w-96">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-400 transition-colors peer-focus:text-blue-600 dark:peer-focus:text-blue-400" />
            <Input
              placeholder={t('search.placeholder')}
              className="peer ps-10 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 transition-all duration-200 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:scale-105"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
