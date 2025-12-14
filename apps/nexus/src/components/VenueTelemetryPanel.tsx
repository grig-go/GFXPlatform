import { Card } from "./ui/card";
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, LineChart, Line, BarChart, Bar } from "recharts";
import { CountUp } from "./CountUp";
import { useTranslation } from "react-i18next";

const powerData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 350 + Math.random() * 100,
}));

const tempData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 20 + Math.random() * 4,
}));

const networkData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 800 + Math.random() * 200,
}));

const latencyData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 5 + Math.random() * 10,
}));

const audioData = Array.from({ length: 20 }, (_, i) => ({
  time: i,
  value: 40 + Math.random() * 50,
}));

export function VenueTelemetryPanel() {
  const { t } = useTranslation('dashboard');

  return (
    <div>
      <h2 className="text-slate-900 dark:text-slate-100 mb-4">{t('telemetry.title')}</h2>
      <div className="grid grid-cols-5 gap-4">
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-amber-300 dark:hover:border-amber-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "0ms" }}>
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('telemetry.powerConsumption')}</div>
            <div className="text-slate-900 dark:text-slate-100 text-2xl">
              <CountUp end={412} suffix=" kW" />
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={powerData}>
                  <defs>
                    <linearGradient id="powerGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#f59e0b"
                    fill="url(#powerGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-green-300 dark:hover:border-green-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "50ms" }}>
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('telemetry.ambientTemp')}</div>
            <div className="text-slate-900 dark:text-slate-100 text-2xl">
              <CountUp end={22.4} decimals={1} suffix="°C" />
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={tempData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-blue-300 dark:hover:border-blue-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "100ms" }}>
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('telemetry.networkThroughput')}</div>
            <div className="text-slate-900 dark:text-slate-100 text-2xl">
              <CountUp end={942} suffix=" Mbps" />
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={networkData}>
                  <defs>
                    <linearGradient id="networkGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3b82f6"
                    fill="url(#networkGradient)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-purple-300 dark:hover:border-purple-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "150ms" }}>
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('telemetry.showSyncLatency')}</div>
            <div className="text-slate-900 dark:text-slate-100 text-2xl">
              <CountUp end={8.2} decimals={1} suffix=" ms" />
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={latencyData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 hover:border-cyan-300 dark:hover:border-cyan-700 animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: "200ms" }}>
          <div className="space-y-2">
            <div className="text-slate-500 dark:text-slate-400 text-sm">{t('telemetry.audioLevels')}</div>
            <div className="text-slate-900 dark:text-slate-100 text-2xl">
              <CountUp end={72} suffix=" dB" />
            </div>
            <div className="h-16">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={audioData}>
                  <Bar dataKey="value" fill="#06b6d4" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
