import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { Lightbulb, Monitor, Volume2, Radio, Video, Layers, Scroll, Thermometer, Network } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";

const mockSparklineData = Array.from({ length: 20 }, (_, i) => ({
  value: 60 + Math.random() * 40,
}));

// System IDs mapped to translation keys
const systemTranslationKeys: Record<string, string> = {
  "lighting": "lighting",
  "led-displays": "ledDisplays",
  "audio": "audio",
  "broadcast": "broadcastControl",
  "show-playback": "showPlayback",
  "graphics": "graphics",
  "signage": "signage",
  "environmental": "environmental",
  "network": "networkSecurity",
};

// Subtitle translation keys
const subtitleTranslationKeys: Record<string, string> = {
  "show-playback": "pixeraDisguise",
  "graphics": "unreal",
  "environmental": "hvacEnergy",
};

const systems = [
  {
    id: "lighting",
    icon: Lightbulb,
    status: "green",
    uptime: 99.8,
    devicesOnline: 142,
    devicesTotal: 145,
    integrations: ["P", "N"],
  },
  {
    id: "led-displays",
    icon: Monitor,
    status: "yellow",
    uptime: 97.2,
    devicesOnline: 8,
    devicesTotal: 10,
    integrations: ["P", "N", "AI"],
  },
  {
    id: "audio",
    icon: Volume2,
    status: "green",
    uptime: 99.9,
    devicesOnline: 64,
    devicesTotal: 64,
    integrations: ["P", "N"],
  },
  {
    id: "broadcast",
    icon: Radio,
    status: "red",
    uptime: 0,
    devicesOnline: 0,
    devicesTotal: 0,
    integrations: ["P", "N", "AI"],
  },
  {
    id: "show-playback",
    icon: Video,
    status: "green",
    uptime: 99.6,
    devicesOnline: 6,
    devicesTotal: 6,
    integrations: ["P", "N"],
    hasSubtitle: true,
  },
  {
    id: "graphics",
    icon: Layers,
    status: "green",
    uptime: 98.9,
    devicesOnline: 8,
    devicesTotal: 8,
    integrations: ["P", "N", "AI"],
    hasSubtitle: true,
  },
  {
    id: "signage",
    icon: Scroll,
    status: "green",
    uptime: 99.4,
    devicesOnline: 32,
    devicesTotal: 34,
    integrations: ["N"],
  },
  {
    id: "environmental",
    icon: Thermometer,
    status: "green",
    uptime: 99.7,
    devicesOnline: 24,
    devicesTotal: 24,
    integrations: ["P", "N", "AI"],
    hasSubtitle: true,
  },
  {
    id: "network",
    icon: Network,
    status: "red",
    uptime: 96.1,
    devicesOnline: 18,
    devicesTotal: 22,
    integrations: ["P", "N", "AI"],
  },
];

function StatusIndicator({ status }: { status: string }) {
  const colors = {
    green: "bg-green-500",
    yellow: "bg-yellow-500",
    red: "bg-red-500",
  };

  return (
    <div className={`w-2 h-2 rounded-full ${colors[status as keyof typeof colors]} animate-pulse shadow-lg`}
      style={{
        boxShadow: status === 'green' ? '0 0 8px rgba(34, 197, 94, 0.6)' :
                   status === 'yellow' ? '0 0 8px rgba(234, 179, 8, 0.6)' :
                   '0 0 8px rgba(239, 68, 68, 0.6)'
      }}
    />
  );
}

function IntegrationBadge({ type }: { type: string }) {
  const styles = {
    P: "bg-purple-500/20 text-purple-300 border-purple-500/30",
    N: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    AI: "bg-cyan-500/20 text-cyan-300 border-cyan-500/30",
  };

  return (
    <Badge variant="outline" className={`text-xs px-1.5 py-0 ${styles[type as keyof typeof styles]}`}>
      {type}
    </Badge>
  );
}

interface SystemOverviewGridProps {
  onSystemClick?: (systemId: string) => void;
}

export function SystemOverviewGrid({ onSystemClick }: SystemOverviewGridProps) {
  const { t } = useTranslation(['dashboard', 'systems']);
  // Simulate live data changes with pulse effect
  const [pulsing, setPulsing] = useState<string | null>(null);

  useEffect(() => {
    // Randomly pulse a card every 5-10 seconds to simulate live data
    const interval = setInterval(() => {
      const randomSystem = systems[Math.floor(Math.random() * systems.length)];
      setPulsing(randomSystem.id);
      setTimeout(() => setPulsing(null), 2000);
    }, 7000);

    return () => clearInterval(interval);
  }, []);

  const getSystemName = (systemId: string) => {
    const key = systemTranslationKeys[systemId];
    return key ? t(`systems:names.${key}`) : systemId;
  };

  const getSubtitle = (systemId: string) => {
    const key = subtitleTranslationKeys[systemId];
    return key ? t(`systems:integrations.${key}`) : null;
  };

  return (
    <div>
      <h2 className="text-slate-900 dark:text-slate-100 mb-4">{t('dashboard:overview.title')}</h2>
      <div className="grid grid-cols-3 gap-4">
        {systems.map((system) => {
          const Icon = system.icon;
          const isPulsing = pulsing === system.id;
          const subtitle = system.hasSubtitle ? getSubtitle(system.id) : null;

          return (
            <Card
              key={system.id}
              className={`bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 cursor-pointer
                transition-all duration-300 ease-out
                hover:shadow-lg hover:-translate-y-1 hover:border-blue-300 dark:hover:border-blue-700
                ${isPulsing ? 'animate-pulse ring-2 ring-blue-400 dark:ring-blue-500' : ''}
              `}
              onClick={() => onSystemClick?.(system.id)}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div>
                      <div className="text-slate-900 dark:text-slate-100">{getSystemName(system.id)}</div>
                      {subtitle && (
                        <div className="text-slate-500 dark:text-slate-400 text-xs">{subtitle}</div>
                      )}
                    </div>
                  </div>
                  <StatusIndicator status={system.status} />
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">{t('dashboard:overview.uptime')}</div>
                    <div className="text-slate-900 dark:text-slate-100">{system.uptime}%</div>
                  </div>
                  <div>
                    <div className="text-slate-500 dark:text-slate-400 text-xs">{t('dashboard:overview.devices')}</div>
                    <div className="text-slate-900 dark:text-slate-100">
                      {system.devicesOnline}/{system.devicesTotal}
                    </div>
                  </div>
                </div>

                {/* Sparkline */}
                <div className="h-12 -mx-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={mockSparklineData}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                {/* Integration badges */}
                <div className="flex gap-1">
                  {system.integrations.map((integration) => (
                    <IntegrationBadge key={integration} type={integration} />
                  ))}
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
