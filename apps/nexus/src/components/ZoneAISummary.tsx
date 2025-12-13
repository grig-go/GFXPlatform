import { Sparkles, TrendingUp, Zap, CheckCircle2 } from "lucide-react";
import { Button } from "./ui/button";

interface Insight {
  type: "success" | "warning" | "info";
  text: string;
  icon: any;
}

interface ZoneAISummaryProps {
  zoneId: string | null;
}

// Zone-specific insights data
const zoneInsights: Record<string, {
  insights: Insight[];
  suggestedAction: string;
  score: number;
  recentOptimizations: { action: string; time: string }[];
}> = {
  "gate-a10-a18": {
    insights: [
      {
        type: "success",
        text: "Lighting latency recovered to normal after morning spike.",
        icon: CheckCircle2
      },
      {
        type: "warning",
        text: "Energy usage +8% above baseline due to increased passenger flow.",
        icon: TrendingUp
      },
      {
        type: "info",
        text: "LED displays running at optimal temperature across all gates.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Reduce LED brightness by 10% to normalize energy consumption without impacting passenger experience.",
    score: 94,
    recentOptimizations: [
      { action: "Audio levels balanced", time: "1h ago" },
      { action: "HVAC schedule optimized", time: "3h ago" },
      { action: "Lighting zones merged", time: "5h ago" }
    ]
  },
  "security-a": {
    insights: [
      {
        type: "success",
        text: "All CCTV cameras operational with 99.9% uptime.",
        icon: CheckCircle2
      },
      {
        type: "info",
        text: "Queue sensors detecting optimal passenger flow.",
        icon: CheckCircle2
      },
      {
        type: "success",
        text: "Paging system audio clarity improved by 15%.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Consider adding 2 additional queue sensors at checkpoint entrance for better flow prediction.",
    score: 98,
    recentOptimizations: [
      { action: "Camera angles adjusted", time: "2h ago" },
      { action: "Lighting intensity increased", time: "4h ago" },
      { action: "Audio zones calibrated", time: "6h ago" }
    ]
  },
  "immigration-a": {
    insights: [
      {
        type: "success",
        text: "Environmental sensors reporting optimal temperature and humidity.",
        icon: CheckCircle2
      },
      {
        type: "info",
        text: "Digital signage displaying real-time queue updates effectively.",
        icon: CheckCircle2
      },
      {
        type: "warning",
        text: "LED display brightness may need adjustment for glare reduction.",
        icon: TrendingUp
      }
    ],
    suggestedAction: "Reduce LED display brightness by 15% during peak sunlight hours to minimize glare.",
    score: 92,
    recentOptimizations: [
      { action: "HVAC balanced", time: "1h ago" },
      { action: "Signage content updated", time: "2h ago" },
      { action: "Lighting dimmed", time: "4h ago" }
    ]
  },
  "baggage-a": {
    insights: [
      {
        type: "success",
        text: "Conveyor status displays showing 100% accuracy.",
        icon: CheckCircle2
      },
      {
        type: "info",
        text: "Show playback servers running smoothly with low latency.",
        icon: CheckCircle2
      },
      {
        type: "success",
        text: "Audio announcements clear and audible throughout hall.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Schedule preventive maintenance for conveyor belt 3 based on usage patterns.",
    score: 96,
    recentOptimizations: [
      { action: "Display sync corrected", time: "30m ago" },
      { action: "Audio volume adjusted", time: "2h ago" },
      { action: "Playback optimized", time: "5h ago" }
    ]
  },
  "food-court-a": {
    insights: [
      {
        type: "success",
        text: "Digital menu displays updating in real-time with no lag.",
        icon: CheckCircle2
      },
      {
        type: "warning",
        text: "HVAC load +12% higher during lunch hours.",
        icon: TrendingUp
      },
      {
        type: "info",
        text: "Lighting levels optimal for dining experience.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Pre-cool the area 15 minutes before peak lunch hours to reduce HVAC strain.",
    score: 89,
    recentOptimizations: [
      { action: "Menu content refreshed", time: "1h ago" },
      { action: "HVAC schedule adjusted", time: "3h ago" },
      { action: "Audio ambiance tuned", time: "6h ago" }
    ]
  },
  "retail-a": {
    insights: [
      {
        type: "success",
        text: "LED displays showcasing promotional content with high engagement.",
        icon: CheckCircle2
      },
      {
        type: "info",
        text: "Audio levels balanced for optimal shopping atmosphere.",
        icon: CheckCircle2
      },
      {
        type: "success",
        text: "Signage routing customers efficiently through retail corridor.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Increase LED display brightness by 5% to improve visibility in high-traffic areas.",
    score: 91,
    recentOptimizations: [
      { action: "Display content rotated", time: "1h ago" },
      { action: "Signage updated", time: "4h ago" },
      { action: "Audio synchronized", time: "7h ago" }
    ]
  },
  "lounge-a": {
    insights: [
      {
        type: "success",
        text: "Environmental controls maintaining premium comfort levels.",
        icon: CheckCircle2
      },
      {
        type: "info",
        text: "Audio system providing ambient background at ideal volume.",
        icon: CheckCircle2
      },
      {
        type: "success",
        text: "Lighting creating relaxing atmosphere with warm tones.",
        icon: CheckCircle2
      }
    ],
    suggestedAction: "Implement automated lighting adjustment based on time of day for enhanced guest experience.",
    score: 97,
    recentOptimizations: [
      { action: "Temperature adjusted", time: "2h ago" },
      { action: "Lighting scenes updated", time: "5h ago" },
      { action: "Audio playlist refreshed", time: "8h ago" }
    ]
  }
};

export function ZoneAISummary({ zoneId }: ZoneAISummaryProps) {
  // Get zone-specific data or use default
  const zoneData = zoneId ? zoneInsights[zoneId] : null;
  
  if (!zoneData) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden h-fit sticky top-6">
        <div className="border-b border-slate-200 dark:border-slate-800 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-slate-900 dark:text-slate-100">AI Zone Summary</h2>
          </div>
          <p className="text-slate-600 dark:text-slate-400">Select a zone to view insights</p>
        </div>
        <div className="p-4">
          <p className="text-slate-500 dark:text-slate-500 text-center py-8">
            No zone selected
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
          <h2 className="text-slate-900 dark:text-slate-100">AI Zone Summary</h2>
        </div>
        <p className="text-slate-600 dark:text-slate-400">Intelligent analysis & recommendations</p>
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
              <p className="text-slate-700 dark:text-slate-300">{insight.text}</p>
            </div>
          ))}
        </div>
        
        {/* Suggested Action */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="flex items-start gap-2 mb-3">
            <Zap className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div>
              <div className="text-slate-900 dark:text-slate-100 mb-1">Suggested Action</div>
              <p className="text-slate-700 dark:text-slate-300">
                {zoneData.suggestedAction}
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Apply Optimization
            </Button>
            <Button variant="outline" className="w-full border-slate-200 dark:border-slate-700">
              View Details
            </Button>
          </div>
        </div>
        
        {/* Performance Score */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-slate-600 dark:text-slate-400 mb-2">Zone Performance Score</div>
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
            {zoneData.score >= 95 ? "Excellent performance across all systems" :
             zoneData.score >= 85 ? "Good performance with minor optimization opportunities" :
             "Performance acceptable, optimization recommended"}
          </p>
        </div>
        
        {/* Recent Optimizations */}
        <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
          <div className="text-slate-900 dark:text-slate-100 mb-3">Recent Optimizations</div>
          <div className="space-y-2">
            {zoneData.recentOptimizations.map((optimization, index) => (
              <div key={index} className="flex items-center justify-between text-slate-700 dark:text-slate-300">
                <span>{optimization.action}</span>
                <span className="text-slate-500 dark:text-slate-500">{optimization.time}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}