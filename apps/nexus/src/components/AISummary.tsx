import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Sparkles, TrendingUp, CheckCircle2, AlertTriangle } from "lucide-react";
import { useState, useEffect } from "react";

const insights = [
  {
    type: "positive",
    text: "Lighting latency recovered to normal levels",
    icon: CheckCircle2,
  },
  {
    type: "warning",
    text: "Two LED controllers offline in Concourse B",
    icon: AlertTriangle,
  },
  {
    type: "positive",
    text: "Network throughput 15% above baseline",
    icon: TrendingUp,
  },
];

interface AISummaryProps {
  onNavigateToTimeline?: () => void;
}

export function AISummary({ onNavigateToTimeline }: AISummaryProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [sparkleAnimation, setSparkleAnimation] = useState(false);

  // Simulate AI thinking animation
  useEffect(() => {
    const interval = setInterval(() => {
      setSparkleAnimation(true);
      setTimeout(() => setSparkleAnimation(false), 1000);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="sticky top-6 animate-in fade-in slide-in-from-right-4 duration-500">
      <Card className="bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-900 dark:to-slate-800 border-slate-200 dark:border-slate-700 p-6 transition-all duration-300 hover:shadow-xl">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center transition-all duration-500 ${sparkleAnimation ? 'scale-110 rotate-12' : 'scale-100 rotate-0'}`}>
              <Sparkles className={`w-4 h-4 text-white transition-all duration-500 ${sparkleAnimation ? 'animate-pulse' : ''}`} />
            </div>
            <h3 className="text-slate-900 dark:text-slate-100">AI Summary</h3>
          </div>

          {/* System state */}
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2 duration-300" style={{ animationDelay: "100ms" }}>
            <div className="text-slate-600 dark:text-slate-300 text-sm">Operational State</div>
            <div className="text-slate-900 dark:text-slate-100">
              All critical systems operational. 2 minor issues detected requiring attention.
            </div>
          </div>

          {/* Insights */}
          <div className="space-y-3">
            {insights.map((insight, index) => {
              const Icon = insight.icon;
              return (
                <div 
                  key={index} 
                  className="flex items-start gap-2 animate-in fade-in slide-in-from-left-2 duration-300 hover:translate-x-1 transition-transform"
                  style={{ animationDelay: `${200 + index * 100}ms` }}
                >
                  <Icon
                    className={`w-4 h-4 mt-0.5 transition-all duration-300 ${
                      insight.type === "positive"
                        ? "text-green-400"
                        : "text-yellow-400 animate-pulse"
                    }`}
                  />
                  <div className="text-slate-700 dark:text-slate-300 text-sm">{insight.text}</div>
                </div>
              );
            })}
          </div>

          {/* Recommendations */}
          <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
            <div className="text-slate-600 dark:text-slate-300 text-sm mb-2">Recommendations</div>
            <ul className="space-y-2 text-slate-600 dark:text-slate-400 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Check power supply to Concourse B LED grid</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Schedule network switch firmware update</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 dark:text-blue-400 mt-0.5">•</span>
                <span>Optimize show sync buffer settings</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="space-y-2 pt-2">
            <Button 
              className="w-full bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 transition-all duration-200 hover:scale-105 active:scale-95" 
              onClick={onNavigateToTimeline}
            >
              View Details
            </Button>
            <Button 
              variant="outline" 
              className="w-full border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200 hover:scale-105 active:scale-95"
            >
              Apply Optimization
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}