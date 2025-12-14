import { AlertTriangle, Info, CheckCircle, XCircle, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";

interface LogEntry {
  id: string;
  timestamp: string;
  type: "info" | "warning" | "error" | "success";
  categoryKey: string;
  messageKey: string;
  zoneKey?: string;
}

const logs: LogEntry[] = [
  {
    id: "1",
    timestamp: "14:32:45",
    type: "error",
    categoryKey: "alerts.categories.audioSystem",
    messageKey: "alerts.messages.speakerOffline",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "2",
    timestamp: "14:28:12",
    type: "warning",
    categoryKey: "alerts.categories.ledDisplay",
    messageKey: "alerts.messages.reducedBrightness",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "3",
    timestamp: "14:15:03",
    type: "success",
    categoryKey: "alerts.categories.lighting",
    messageKey: "alerts.messages.lightingOperational",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "4",
    timestamp: "14:02:34",
    type: "info",
    categoryKey: "alerts.categories.environmental",
    messageKey: "alerts.messages.tempAdjusted",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "5",
    timestamp: "13:58:19",
    type: "warning",
    categoryKey: "alerts.categories.security",
    messageKey: "alerts.messages.cameraLensCleaning",
    zoneKey: "alerts.zones.security"
  },
  {
    id: "6",
    timestamp: "13:45:27",
    type: "info",
    categoryKey: "alerts.categories.signage",
    messageKey: "alerts.messages.flightInfoUpdated",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "7",
    timestamp: "13:32:08",
    type: "success",
    categoryKey: "alerts.categories.audioSystem",
    messageKey: "alerts.messages.paTestComplete",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "8",
    timestamp: "13:18:45",
    type: "info",
    categoryKey: "alerts.categories.showPlayback",
    messageKey: "alerts.messages.contentSyncInitiated",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "9",
    timestamp: "13:05:22",
    type: "warning",
    categoryKey: "alerts.categories.environmental",
    messageKey: "alerts.messages.hvacCapacity",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "10",
    timestamp: "12:52:16",
    type: "info",
    categoryKey: "alerts.categories.ledDisplay",
    messageKey: "alerts.messages.contentRotationComplete",
    zoneKey: "alerts.zones.gateCluster"
  },
  {
    id: "11",
    timestamp: "12:38:47",
    type: "success",
    categoryKey: "alerts.categories.security",
    messageKey: "alerts.messages.securityOnline",
    zoneKey: "alerts.zones.security"
  },
  {
    id: "12",
    timestamp: "12:21:33",
    type: "info",
    categoryKey: "alerts.categories.lighting",
    messageKey: "alerts.messages.brightnessAdjusted",
    zoneKey: "alerts.zones.gateCluster"
  }
];

function getLogIcon(type: string) {
  switch (type) {
    case "error":
      return XCircle;
    case "warning":
      return AlertTriangle;
    case "success":
      return CheckCircle;
    case "info":
    default:
      return Info;
  }
}

function getLogColor(type: string) {
  switch (type) {
    case "error":
      return "text-red-500 dark:text-red-400";
    case "warning":
      return "text-yellow-500 dark:text-yellow-400";
    case "success":
      return "text-green-500 dark:text-green-400";
    case "info":
    default:
      return "text-blue-500 dark:text-blue-400";
  }
}

function getLogBg(type: string) {
  switch (type) {
    case "error":
      return "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800";
    case "warning":
      return "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800";
    case "success":
      return "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800";
    case "info":
    default:
      return "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700";
  }
}

export function ZoneLogsAndAlerts() {
  const { t } = useTranslation('zones');
  const alerts = logs.filter(log => log.type === "error" || log.type === "warning");
  const criticalCount = alerts.filter(a => a.type === "error").length;
  const warningCount = alerts.filter(a => a.type === "warning").length;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-slate-900 dark:text-slate-100">{t('logsAlerts.title')}</h2>
          <div className="flex items-center gap-2">
            <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded text-xs">
              {criticalCount} {t('logsAlerts.critical')}
            </span>
            <span className="px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 rounded text-xs">
              {warningCount} {t('logsAlerts.warning')}
            </span>
          </div>
        </div>
      </div>
      
      <div className="p-4 space-y-3 max-h-96 overflow-y-auto">
        {alerts.map((alert) => {
          const Icon = getLogIcon(alert.type);
          return (
            <div
              key={alert.id}
              className={`p-3 border rounded-lg ${getLogBg(alert.type)}`}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${getLogColor(alert.type)}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-900 dark:text-slate-100">{t(alert.categoryKey)}</span>
                    <span className="text-slate-500 dark:text-slate-500 text-xs">{alert.zoneKey ? t(alert.zoneKey) : ''}</span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs">
                    {t(alert.messageKey)}
                  </p>
                  <div className="flex items-center gap-1 mt-2 text-slate-500 dark:text-slate-500 text-xs">
                    <Clock className="w-3 h-3" />
                    <span>{alert.timestamp}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}