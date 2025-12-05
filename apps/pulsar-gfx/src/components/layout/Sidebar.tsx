import { useLocation, Link } from 'react-router-dom';
import { cn, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@emergent-platform/ui';
import {
  LayoutTemplate,
  ListOrdered,
  Palette,
  ChevronRight,
} from 'lucide-react';

interface NavItem {
  icon: React.ElementType;
  label: string;
  path: string;
  badge?: string | number;
}

const navItems: NavItem[] = [
  {
    icon: LayoutTemplate,
    label: 'Templates',
    path: '/templates',
  },
  {
    icon: ListOrdered,
    label: 'Pages & Playlists',
    path: '/workspace',
  },
  {
    icon: Palette,
    label: 'Custom UI',
    path: '/custom-ui',
  },
];

export function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path.includes('?')) {
      const basePath = path.split('?')[0];
      return location.pathname === basePath;
    }
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <TooltipProvider>
      <aside className="w-14 sm:w-16 border-r border-border bg-card/50 backdrop-blur-sm flex flex-col items-center py-3 sm:py-4 gap-1.5 sm:gap-2 shrink-0">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <Tooltip key={item.path} delayDuration={0}>
              <TooltipTrigger asChild>
                <Link to={item.path}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      'w-10 h-10 sm:w-12 sm:h-12 relative transition-all duration-200',
                      active
                        ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    {item.badge && (
                      <span className="absolute -top-1 -right-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-[10px] font-medium rounded-full w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center">
                        {item.badge}
                      </span>
                    )}
                    {active && (
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 sm:w-1 h-5 sm:h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-r" />
                    )}
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" className="flex items-center gap-2">
                {item.label}
                <ChevronRight className="w-3 h-3 text-muted-foreground" />
              </TooltipContent>
            </Tooltip>
          );
        })}

        {/* Quick Access Section */}
        <div className="mt-auto space-y-1.5 sm:space-y-2">
          <div className="w-10 sm:w-12 h-px bg-border/50" />

          {/* Keyboard Shortcuts Hint */}
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <div className="w-10 h-10 sm:w-12 sm:h-12 flex flex-col items-center justify-center text-[9px] sm:text-[10px] text-muted-foreground cursor-default">
                <span className="font-mono bg-muted/50 px-1 sm:px-1.5 py-0.5 rounded text-cyan-400">F1</span>
                <span className="mt-0.5">Take</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              <div className="text-xs space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-cyan-400">F1</span>
                  <span>Take/Play</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-cyan-400">F2</span>
                  <span>Stop</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-cyan-400">F3</span>
                  <span>Clear Layer</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-cyan-400">F4</span>
                  <span>Clear All</span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </div>
      </aside>
    </TooltipProvider>
  );
}
