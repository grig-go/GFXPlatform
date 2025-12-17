import { Button } from "./ui/button";
import { Vote, TrendingUp, Trophy, Cloud, Newspaper, School, Bot, Image as ImageIcon } from "lucide-react";

export type DashboardView = 'election' | 'finance' | 'sports' | 'weather' | 'news' | 'school-closings' | 'agents' | 'media';

interface DashboardNavigationProps {
  currentView?: DashboardView;
  onNavigate: (view: DashboardView) => void;
  dashboardConfig?: Array<{
    dashboard_id: string;
    visible: boolean;
    order_index: number;
  }>;
}

export function DashboardNavigation({ currentView, onNavigate, dashboardConfig = [] }: DashboardNavigationProps) {
  // Default dashboards configuration
  const defaultDashboards = [
    { dashboard_id: "election", visible: true, order_index: 0 },
    { dashboard_id: "finance", visible: true, order_index: 1 },
    { dashboard_id: "sports", visible: true, order_index: 2 },
    { dashboard_id: "weather", visible: true, order_index: 3 },
    { dashboard_id: "news", visible: true, order_index: 4 },
    { dashboard_id: "agents", visible: true, order_index: 5 },
    { dashboard_id: "school_closings", visible: true, order_index: 6 },
    { dashboard_id: "media_library", visible: true, order_index: 7 }
  ];
  
  const activeDashboards = dashboardConfig.length > 0 ? dashboardConfig : defaultDashboards;
  
  // Filter visible dashboards and sort by order_index
  const visibleDashboards = activeDashboards
    .filter(d => d.visible)
    .sort((a, b) => a.order_index - b.order_index);
  
  // Map dashboard IDs to their button data
  const dashboardButtons: Record<string, { view: DashboardView; icon: any; label: string }> = {
    election: { view: 'election', icon: Vote, label: 'Elections' },
    finance: { view: 'finance', icon: TrendingUp, label: 'Finance' },
    sports: { view: 'sports', icon: Trophy, label: 'Sports' },
    weather: { view: 'weather', icon: Cloud, label: 'Weather' },
    news: { view: 'news', icon: Newspaper, label: 'News' },
    school_closings: { view: 'school-closings', icon: School, label: 'School Closings' },
    agents: { view: 'agents', icon: Bot, label: 'Agents' },
    media_library: { view: 'media', icon: ImageIcon, label: 'Media' },
  };
  
  return (
    <div className="flex items-center gap-2 mb-8">
      {visibleDashboards.map(dashboard => {
        const buttonData = dashboardButtons[dashboard.dashboard_id];
        if (!buttonData) return null;
        
        const Icon = buttonData.icon;
        
        return (
          <Button
            key={dashboard.dashboard_id}
            variant={currentView === buttonData.view ? 'default' : 'outline'}
            onClick={() => onNavigate(buttonData.view)}
            className="gap-2"
          >
            <Icon className="w-4 h-4" />
            {buttonData.label}
          </Button>
        );
      })}
    </div>
  );
}
