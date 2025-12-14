import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertCircle, XCircle, Activity, TrendingUp, Zap, Wifi, Gauge, Edit, ChevronDown, RotateCw, FileText } from 'lucide-react';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { LineChart, Line, ResponsiveContainer } from 'recharts';

interface Device {
  id: string;
  name: string;
  type: string;
  status: "online" | "warning" | "offline";
  uptime: string;
  location: string;
  specs?: string;
  zone: string;
  systemName: string;
  lastSeen?: string;
  ipAddress?: string;
}

interface DeviceCardProps {
  device: Device;
  onAction: (device: Device, action: 'edit' | 'restart' | 'logs' | 'health') => void;
}

// Memoized helper functions outside component
const getHealthScore = (status: string, uptime: string) => {
  const uptimeHours = parseInt(uptime) || 0;
  let baseScore = status === 'online' ? 95 : status === 'warning' ? 65 : 20;
  const uptimeBonus = Math.min(5, uptimeHours / 100);
  return Math.min(100, baseScore + uptimeBonus);
};

const generateTrendData = (deviceId: string) => {
  const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 24 }, (_, i) => {
    const variance = Math.sin(seed + i) * 10;
    return { value: 85 + variance };
  });
};

const getLoadPercent = (deviceId: string) => {
  const seed = deviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Math.floor((seed % 40) + 40);
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "online":
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case "warning":
      return <AlertCircle className="w-4 h-4 text-yellow-500" />;
    case "offline":
      return <XCircle className="w-4 h-4 text-red-500" />;
    default:
      return null;
  }
};

const getStatusBadge = (status: string, t: (key: string) => string) => {
  const baseClasses = "px-2 py-1 rounded-full text-xs";
  switch (status) {
    case "online":
      return <span className={`${baseClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`}>{t('status.online')}</span>;
    case "warning":
      return <span className={`${baseClasses} bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400`}>{t('status.warning')}</span>;
    case "offline":
      return <span className={`${baseClasses} bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`}>{t('status.offline')}</span>;
    default:
      return null;
  }
};

const CircularProgress = ({ value, size = 70, strokeWidth = 6, status }: { value: number; size?: number; strokeWidth?: number; status: string }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;

  const getColor = () => {
    if (status === 'online') return '#10b981';
    if (status === 'warning') return '#f59e0b';
    return '#ef4444';
  };

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200 dark:text-slate-700"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor()}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="transition-all duration-1000 ease-out"
          style={{ strokeDashoffset: offset }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {Math.round(value)}
        </span>
      </div>
    </div>
  );
};

export function DeviceCard({ device, onAction }: DeviceCardProps) {
  const { t } = useTranslation(['devices', 'common']);
  const healthScore = useMemo(() => getHealthScore(device.status, device.uptime), [device.status, device.uptime]);
  const trendData = useMemo(() => generateTrendData(device.id), [device.id]);
  const loadPercent = useMemo(() => getLoadPercent(device.id), [device.id]);

  return (
    <div
      className={`relative overflow-hidden bg-gradient-to-br ${
        device.status === 'online' 
          ? 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' 
          : device.status === 'warning'
          ? 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20'
          : 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20'
      } border-2 ${
        device.status === 'online'
          ? 'border-green-200 dark:border-green-800/50'
          : device.status === 'warning'
          ? 'border-yellow-200 dark:border-yellow-800/50'
          : 'border-red-200 dark:border-red-800/50'
      } rounded-xl transition-all duration-300 hover:shadow-xl hover:-translate-y-1 cursor-pointer`}
    >
      <div className="relative p-4">
        {/* Header with Status Indicator */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <div className={device.status === 'online' ? 'animate-pulse' : ''}>
                {getStatusIcon(device.status)}
              </div>
              <h3 className="text-slate-900 dark:text-slate-100 truncate text-sm">{device.name}</h3>
            </div>
            <p className="text-slate-600 dark:text-slate-400 text-xs truncate">{device.type}</p>
          </div>
          <div className="ml-2">
            {getStatusBadge(device.status, t)}
          </div>
        </div>

        {/* Health Score Circle */}
        <div className="flex items-center justify-center my-2">
          <div className="relative">
            <CircularProgress value={healthScore} status={device.status} size={70} strokeWidth={6} />
            <div className="absolute -bottom-5 left-1/2 transform -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('card.health')}</span>
            </div>
          </div>
        </div>

        {/* Performance Trend Sparkline */}
        <div className="mt-6 mb-3 bg-white/50 dark:bg-slate-800/30 rounded-lg p-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {t('card.performance24h')}
            </span>
            <span className="text-xs text-slate-900 dark:text-slate-100">
              {trendData[trendData.length - 1].value.toFixed(0)}%
            </span>
          </div>
          <ResponsiveContainer width="100%" height={32}>
            <LineChart data={trendData}>
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke={device.status === 'online' ? '#10b981' : device.status === 'warning' ? '#f59e0b' : '#ef4444'}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-2 gap-2 mb-3">
          {/* Uptime */}
          <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Activity className="w-3 h-3 text-blue-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('card.uptime')}</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-sm">{device.uptime}</p>
          </div>

          {/* Connection */}
          <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Wifi className={`w-3 h-3 ${device.status === 'online' ? 'text-green-500' : device.status === 'warning' ? 'text-yellow-500' : 'text-red-500'}`} />
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('card.signal')}</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-xs">{t('card.excellent')}</p>
          </div>

          {/* System */}
          <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Zap className="w-3 h-3 text-purple-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('card.system')}</span>
            </div>
            <p className="text-slate-900 dark:text-slate-100 text-xs truncate">{device.systemName}</p>
          </div>

          {/* Load */}
          <div className="bg-white/70 dark:bg-slate-800/50 rounded-lg p-2">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Activity className="w-3 h-3 text-orange-500" />
              <span className="text-xs text-slate-600 dark:text-slate-400">{t('card.load')}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="flex-1 bg-slate-200 dark:bg-slate-700 rounded-full h-1">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-amber-500 h-1 rounded-full"
                  style={{ width: `${loadPercent}%` }}
                />
              </div>
              <span className="text-xs text-slate-900 dark:text-slate-100">{loadPercent}%</span>
            </div>
          </div>
        </div>

        {/* Location and IP */}
        <div className="space-y-1.5 mb-3 bg-white/50 dark:bg-slate-800/30 rounded-lg p-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">{t('card.location')}</span>
            <span className="text-slate-900 dark:text-slate-100 font-medium">{device.location}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-600 dark:text-slate-400">{t('card.ipAddress')}</span>
            <span className="text-slate-900 dark:text-slate-100 font-mono text-xs">{device.ipAddress}</span>
          </div>
          {device.specs && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-600 dark:text-slate-400">{t('card.specs')}</span>
              <span className="text-slate-900 dark:text-slate-100">{device.specs}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(device, 'health')}
            className="flex-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 h-8 text-xs"
          >
            <Gauge className="w-3 h-3 mr-1" />
            {t('card.health')}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onAction(device, 'edit')}
            className="flex-1 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 h-8 text-xs"
          >
            <Edit className="w-3 h-3 mr-1" />
            {t('common:actions.edit')}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm" 
                className="px-2 bg-white/80 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 border-slate-300 dark:border-slate-700 h-8"
              >
                <ChevronDown className="w-3 h-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAction(device, 'restart')}>
                <RotateCw className="w-3.5 h-3.5 mr-2" />
                {t('card.restart')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAction(device, 'logs')}>
                <FileText className="w-3.5 h-3.5 mr-2" />
                {t('card.viewLogs')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}