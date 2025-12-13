import { LucideIcon, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AppCardProps {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  iconBgColor: string; // e.g., "bg-blue-500/10"
  iconColor: string; // e.g., "text-blue-600"
  url?: string;
  enabled?: boolean;
  stats?: Array<{ label: string; value: string | number }>;
  onClick?: () => void;
}

export function AppCard({
  label,
  description,
  icon: Icon,
  iconBgColor,
  iconColor,
  url,
  enabled = true,
  stats,
  onClick,
}: AppCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-slate-900 rounded-xl cursor-pointer transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        "border border-slate-200 dark:border-slate-800",
        !enabled && "opacity-50 pointer-events-none"
      )}
      onClick={handleClick}
    >
      <div className="p-8">
        {/* Header row: Icon + Title */}
        <div className="flex items-center gap-4 mb-4">
          <div
            className={cn(
              "w-14 h-14 rounded-xl flex items-center justify-center",
              iconBgColor
            )}
          >
            <Icon className={cn("w-7 h-7", iconColor)} />
          </div>
          <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">
            {label}
          </h3>
          <ExternalLink className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-auto" />
        </div>

        {/* Description */}
        <p className="text-base text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 mb-5">
          {description}
        </p>

        {/* Separator line */}
        <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
          {/* Stats row */}
          {stats && stats.length > 0 ? (
            <div className="flex items-center gap-5">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-base font-semibold text-slate-900 dark:text-slate-100">
                    {stat.value}
                  </span>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {stat.label}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400 dark:text-slate-500">
                Click to launch
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
