import { Sparkles, TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";
import { useTranslation } from "react-i18next";
import { TFunction } from "i18next";

interface Insight {
  type: "success" | "warning" | "info";
  textKey: string;
  icon: any;
}

interface ZoneAISummaryProps {
  zoneId: string | null;
}

// Zone-specific insights data with translation keys
const zoneInsights: Record<string, {
  insights: Insight[];
  suggestedActionKey: string;
  score: number;
  recentOptimizations: { actionKey: string; timeKey: string }[];
}> = {
  "gate-a10-a18": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.gateA.lightingRecovered",
        icon: CheckCircle2
      },
      {
        type: "warning",
        textKey: "aiInsights.gateA.energyUsage",
        icon: TrendingUp
      },
      {
        type: "info",
        textKey: "aiInsights.gateA.ledOptimal",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.gateA.suggestedAction",
    score: 94,
    recentOptimizations: [
      { actionKey: "optimizations.audioBalanced", timeKey: "time.1hAgo" },
      { actionKey: "optimizations.hvacOptimized", timeKey: "time.3hAgo" },
      { actionKey: "optimizations.lightingMerged", timeKey: "time.5hAgo" }
    ]
  },
  "security-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.securityA.cctvOperational",
        icon: CheckCircle2
      },
      {
        type: "info",
        textKey: "aiInsights.securityA.queueSensors",
        icon: CheckCircle2
      },
      {
        type: "success",
        textKey: "aiInsights.securityA.pagingImproved",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.securityA.suggestedAction",
    score: 98,
    recentOptimizations: [
      { actionKey: "optimizations.cameraAdjusted", timeKey: "time.2hAgo" },
      { actionKey: "optimizations.lightingIncreased", timeKey: "time.4hAgo" },
      { actionKey: "optimizations.audioCalibrated", timeKey: "time.6hAgo" }
    ]
  },
  "immigration-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.immigrationA.environmentalOptimal",
        icon: CheckCircle2
      },
      {
        type: "info",
        textKey: "aiInsights.immigrationA.signageEffective",
        icon: CheckCircle2
      },
      {
        type: "warning",
        textKey: "aiInsights.immigrationA.ledGlare",
        icon: TrendingUp
      }
    ],
    suggestedActionKey: "aiInsights.immigrationA.suggestedAction",
    score: 92,
    recentOptimizations: [
      { actionKey: "optimizations.hvacBalanced", timeKey: "time.1hAgo" },
      { actionKey: "optimizations.signageUpdated", timeKey: "time.2hAgo" },
      { actionKey: "optimizations.lightingDimmed", timeKey: "time.4hAgo" }
    ]
  },
  "baggage-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.baggageA.conveyorAccurate",
        icon: CheckCircle2
      },
      {
        type: "info",
        textKey: "aiInsights.baggageA.playbackSmooth",
        icon: CheckCircle2
      },
      {
        type: "success",
        textKey: "aiInsights.baggageA.audioAudible",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.baggageA.suggestedAction",
    score: 96,
    recentOptimizations: [
      { actionKey: "optimizations.displaySync", timeKey: "time.30mAgo" },
      { actionKey: "optimizations.audioVolume", timeKey: "time.2hAgo" },
      { actionKey: "optimizations.playbackOptimized", timeKey: "time.5hAgo" }
    ]
  },
  "food-court-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.foodCourtA.menuRealtime",
        icon: CheckCircle2
      },
      {
        type: "warning",
        textKey: "aiInsights.foodCourtA.hvacLoad",
        icon: TrendingUp
      },
      {
        type: "info",
        textKey: "aiInsights.foodCourtA.lightingOptimal",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.foodCourtA.suggestedAction",
    score: 89,
    recentOptimizations: [
      { actionKey: "optimizations.menuRefreshed", timeKey: "time.1hAgo" },
      { actionKey: "optimizations.hvacAdjusted", timeKey: "time.3hAgo" },
      { actionKey: "optimizations.audioTuned", timeKey: "time.6hAgo" }
    ]
  },
  "retail-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.retailA.ledEngagement",
        icon: CheckCircle2
      },
      {
        type: "info",
        textKey: "aiInsights.retailA.audioBalanced",
        icon: CheckCircle2
      },
      {
        type: "success",
        textKey: "aiInsights.retailA.signageRouting",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.retailA.suggestedAction",
    score: 91,
    recentOptimizations: [
      { actionKey: "optimizations.displayRotated", timeKey: "time.1hAgo" },
      { actionKey: "optimizations.signageUpdated", timeKey: "time.4hAgo" },
      { actionKey: "optimizations.audioSync", timeKey: "time.7hAgo" }
    ]
  },
  "lounge-a": {
    insights: [
      {
        type: "success",
        textKey: "aiInsights.loungeA.environmentalComfort",
        icon: CheckCircle2
      },
      {
        type: "info",
        textKey: "aiInsights.loungeA.audioAmbient",
        icon: CheckCircle2
      },
      {
        type: "success",
        textKey: "aiInsights.loungeA.lightingRelaxing",
        icon: CheckCircle2
      }
    ],
    suggestedActionKey: "aiInsights.loungeA.suggestedAction",
    score: 97,
    recentOptimizations: [
      { actionKey: "optimizations.tempAdjusted", timeKey: "time.2hAgo" },
      { actionKey: "optimizations.lightingScenesUpdated", timeKey: "time.5hAgo" },
      { actionKey: "optimizations.audioPlaylistRefreshed", timeKey: "time.8hAgo" }
    ]
  }
};

export function ZoneAISummary({ zoneId }: ZoneAISummaryProps) {
  const { t } = useTranslation('zones');
  // Get zone-specific data or use default
  const zoneData = zoneId ? zoneInsights[zoneId] : null;

  // Get performance description based on score
  const getPerformanceDescription = (score: number) => {
    if (score >= 95) return t('aiSummary.performanceExcellent');
    if (score >= 85) return t('aiSummary.performanceGood');
    return t('aiSummary.performanceAcceptable');
  };

  if (!zoneData) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-fit sticky top-6">
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-slate-900 dark:text-slate-100">{t('aiSummary.title')}</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400">{t('aiSummary.selectZone')}</p>
        </div>
        <div className="p-4">
          <p className="text-slate-500 dark:text-slate-500 text-center py-8">
            {t('aiSummary.noZoneSelected')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-fit sticky top-6">
      <div className="border-b border-slate-200 dark:border-slate-800 p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          <h2 className="text-slate-900 dark:text-slate-100">{t('aiSummary.title')}</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">{t('aiSummary.subtitle')}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Insights */}
        <div className="space-y-3">
          {zoneData.insights.map((insight, index) => (
            <div
              key={index}
              className="flex items-start gap-2 p-3 bg-slate-50 dark:bg-slate-800 rounded-lg"
            >
              <insight.icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                insight.type === "success" ? "text-green-600 dark:text-green-400" :
                insight.type === "warning" ? "text-yellow-600 dark:text-yellow-400" :
                "text-blue-600 dark:text-blue-400"
              }`} />
              <p className="text-slate-700 dark:text-slate-300">{t(insight.textKey)}</p>
            </div>
          ))}
        </div>

        {/* Suggested Action */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-start gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="text-slate-900 dark:text-slate-100 mb-1">{t('aiSummary.suggestedAction')}</div>
              <p className="text-slate-700 dark:text-slate-300">
                {t(zoneData.suggestedActionKey)}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Sparkles className="w-4 h-4 me-2" />
              {t('aiSummary.applyOptimization')}
            </Button>
            <Button variant="outline" className="w-full border-slate-200 dark:border-slate-700">
              {t('aiSummary.viewDetails')}
            </Button>
          </div>
        </div>

        {/* Performance Score */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-slate-600 dark:text-slate-400 mb-2">{t('aiSummary.performanceScore')}</div>
          <div className="flex items-end gap-2 mb-2">
            <span className="text-slate-900 dark:text-slate-100">{zoneData.score}</span>
            <span className="text-slate-600 dark:text-slate-400">/100</span>
          </div>
          <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                zoneData.score >= 95 ? "bg-green-500" :
                zoneData.score >= 85 ? "bg-blue-500" :
                "bg-yellow-500"
              }`}
              style={{ width: `${zoneData.score}%` }}
            ></div>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mt-2">
            {getPerformanceDescription(zoneData.score)}
          </p>
        </div>

        {/* Recent Optimizations */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-slate-900 dark:text-slate-100 mb-3">{t('aiSummary.recentOptimizations')}</div>
          <div className="space-y-2">
            {zoneData.recentOptimizations.map((optimization, index) => (
              <div key={index} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>{t(optimization.actionKey)}</span>
                <span className="text-slate-500 dark:text-slate-500">{t(optimization.timeKey)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}