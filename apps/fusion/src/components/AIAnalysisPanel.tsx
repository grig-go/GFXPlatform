import { X, ChevronLeft, ChevronRight, Sparkles, AlertCircle, TrendingUp, TrendingDown, Zap, MapPin, Cloud, Users, BarChart3, Activity, AlertTriangle, CheckCircle, Info, Loader2, Settings, ChevronDown, Thermometer, Wind, Droplets, Eye, Map, Target, Flame, Snowflake, Sun } from 'lucide-react';
import { useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import type { AIProviderSettings } from '../utils/aiProviderSettings';

interface AIAnalysisPanelProps {
  screenshotImage: string | null;
  aiAnalysis: string | null;
  isAnalyzingImage: boolean;
  analysisError: string | null;
  aiProviderSettings: AIProviderSettings;
  sidebarPosition: 'left' | 'right';
  currentFeature: 'summary' | 'outliers' | 'correlation' | 'sentiment';
  onClose?: () => void;
  onOpenAISettings?: () => void;
}

interface ParsedSection {
  type: 'headline' | 'section' | 'bullet' | 'text';
  content: string;
  icon?: string;
  color?: string;
  bgColor?: string;
  level?: number;
}

// Parse AI response into structured sections
function parseAIResponse(text: string): ParsedSection[] {
  const lines = text.split('\n').filter(line => line.trim());
  const sections: ParsedSection[] = [];

  lines.forEach(line => {
    const trimmed = line.trim();
    
    // Headline (starts with **Headline:)
    if (trimmed.match(/^\*\*Headline:/i)) {
      sections.push({
        type: 'headline',
        content: trimmed.replace(/^\*\*Headline:\s*/i, '').replace(/\*\*/g, '')
      });
    }
    // Section headers (wrapped in **)
    else if (trimmed.match(/^\*\*[^*]+\*\*$/)) {
      const iconInfo = getSectionIcon(trimmed);
      sections.push({
        type: 'section',
        content: trimmed.replace(/\*\*/g, ''),
        icon: iconInfo.icon,
        color: iconInfo.color,
        bgColor: iconInfo.bgColor
      });
    }
    // Bullet points
    else if (trimmed.match(/^[-*]\s/)) {
      sections.push({
        type: 'bullet',
        content: trimmed.replace(/^[-*]\s+/, '').replace(/\*\*/g, ''),
        level: 1
      });
    }
    // Sub-bullets (indented)
    else if (trimmed.match(/^\s+[-*]\s/)) {
      sections.push({
        type: 'bullet',
        content: trimmed.trim().replace(/^[-*]\s+/, '').replace(/\*\*/g, ''),
        level: 2
      });
    }
    // Regular text
    else if (trimmed.length > 0) {
      sections.push({
        type: 'text',
        content: trimmed.replace(/\*\*/g, '')
      });
    }
  });

  return sections;
}

// Get appropriate icon and color for section headers
function getSectionIcon(header: string): { icon: string; color: string; bgColor: string } {
  const lowerHeader = header.toLowerCase();
  
  if (lowerHeader.includes('temperature') || lowerHeader.includes('heat')) 
    return { icon: 'thermometer', color: 'text-red-600', bgColor: 'bg-red-100' };
  if (lowerHeader.includes('weather') || lowerHeader.includes('storm') || lowerHeader.includes('climate')) 
    return { icon: 'cloud', color: 'text-sky-600', bgColor: 'bg-sky-100' };
  if (lowerHeader.includes('election') || lowerHeader.includes('political') || lowerHeader.includes('voting')) 
    return { icon: 'users', color: 'text-indigo-600', bgColor: 'bg-indigo-100' };
  if (lowerHeader.includes('population') || lowerHeader.includes('demographic')) 
    return { icon: 'barChart', color: 'text-purple-600', bgColor: 'bg-purple-100' };
  if (lowerHeader.includes('impact') || lowerHeader.includes('effect')) 
    return { icon: 'activity', color: 'text-emerald-600', bgColor: 'bg-emerald-100' };
  if (lowerHeader.includes('alert') || lowerHeader.includes('warning') || lowerHeader.includes('severe')) 
    return { icon: 'alertTriangle', color: 'text-orange-600', bgColor: 'bg-orange-100' };
  if (lowerHeader.includes('cluster') || lowerHeader.includes('regional')) 
    return { icon: 'mapPin', color: 'text-rose-600', bgColor: 'bg-rose-100' };
  if (lowerHeader.includes('trend') || lowerHeader.includes('pattern')) 
    return { icon: 'trendingUp', color: 'text-teal-600', bgColor: 'bg-teal-100' };
  if (lowerHeader.includes('anomal') || lowerHeader.includes('outlier') || lowerHeader.includes('unusual')) 
    return { icon: 'zap', color: 'text-amber-600', bgColor: 'bg-amber-100' };
  if (lowerHeader.includes('gradient') || lowerHeader.includes('north') || lowerHeader.includes('south')) 
    return { icon: 'map', color: 'text-blue-600', bgColor: 'bg-blue-100' };
  
  return { icon: 'info', color: 'text-blue-600', bgColor: 'bg-blue-100' };
}

// Render icon component
function renderIcon(iconName: string, className: string = 'w-5 h-5') {
  const icons: { [key: string]: any } = {
    cloud: Cloud,
    users: Users,
    barChart: BarChart3,
    activity: Activity,
    alertTriangle: AlertTriangle,
    mapPin: MapPin,
    trendingUp: TrendingUp,
    zap: Zap,
    info: Info,
    thermometer: Thermometer,
    wind: Wind,
    droplets: Droplets,
    eye: Eye,
    map: Map,
    target: Target,
    flame: Flame,
    snowflake: Snowflake,
    sun: Sun
  };
  
  const IconComponent = icons[iconName] || Info;
  return <IconComponent className={className} />;
}

export function AIAnalysisPanel({
  screenshotImage,
  aiAnalysis,
  isAnalyzingImage,
  analysisError,
  aiProviderSettings,
  sidebarPosition,
  currentFeature,
  onClose,
  onOpenAISettings
}: AIAnalysisPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isScreenshotExpanded, setIsScreenshotExpanded] = useState(false);

  const parsedSections = aiAnalysis ? parseAIResponse(aiAnalysis) : [];
  const headline = parsedSections.find(s => s.type === 'headline');
  
  // Map feature names to display titles
  const featureTitles: Record<typeof currentFeature, string> = {
    summary: 'Summary',
    outliers: 'Anomalies',
    correlation: 'Correlation Finder',
    sentiment: 'Social Sentiment'
  };

  return (
    <div
      className={`absolute top-0 bottom-0 right-0 ${isMinimized ? 'w-[60px]' : 'w-[520px]'} z-10 transition-all duration-300`}
    >
      {/* White background that extends full height */}
      <div className="absolute inset-0 bg-[rgba(255,255,255,0.3)]" />
      
      {isMinimized ? (
        /* Minimized state - just show expand arrow */
        <div className="relative h-full flex items-center justify-center">
          <button
            onClick={() => setIsMinimized(false)}
            className="hover:bg-gray-200 rounded p-2 transition-colors"
            aria-label="Expand panel"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        </div>
      ) : (
        /* Expanded state - show full content */
        <div className="relative top-8 mx-8 bg-white shadow-2xl h-[calc(100vh-64px)] flex flex-col">
          {/* Close button */}
          <button
            onClick={() => {
              setIsMinimized(true);
              onClose?.();
            }}
            className="absolute top-4 right-4 hover:bg-gray-300 bg-white/90 rounded p-1 transition-colors font-bold z-10"
            aria-label="Minimize panel"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header - Enhanced Visual */}
          <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-purple-600 to-indigo-700 text-white px-6 py-6">
            {/* Animated background pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 left-0 w-32 h-32 bg-white rounded-full blur-3xl"></div>
              <div className="absolute bottom-0 right-0 w-40 h-40 bg-white rounded-full blur-3xl"></div>
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-white blur-lg opacity-50 rounded-full animate-pulse"></div>
                  <Sparkles className="relative w-7 h-7" />
                </div>
                <h1 className="tracking-tight font-black text-[26px]">{featureTitles[currentFeature]}</h1>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 w-12 bg-white/40 rounded-full"></div>
                <p className="text-white/90 text-sm font-medium">
                  Powered by Emergent
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto">
            {/* Screenshot Debug Section */}
            {screenshotImage && (
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                <Collapsible open={isScreenshotExpanded} onOpenChange={setIsScreenshotExpanded}>
                  <CollapsibleTrigger className="flex items-center gap-2 text-sm font-medium hover:underline cursor-pointer">
                    <ChevronDown className={`h-4 w-4 transition-transform ${isScreenshotExpanded ? 'transform rotate-180' : ''}`} />
                    Screenshot Debug
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3">
                    <img 
                      src={screenshotImage} 
                      alt="Map screenshot" 
                      className="w-full h-auto rounded-lg border border-gray-300 shadow-sm"
                    />
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}

            {/* Loading State - Super Visual */}
            {isAnalyzingImage && (
              <div className="px-6 py-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="absolute inset-0 bg-blue-500 blur-xl opacity-60 rounded-full animate-pulse"></div>
                          <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-4 rounded-2xl shadow-lg">
                            <Loader2 className="h-8 w-8 text-white animate-spin" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-gray-900 text-lg">Analyzing with AI...</p>
                        <p className="text-sm text-gray-600 mt-1 font-medium">
                          Processing your map data with advanced AI models
                        </p>
                        <div className="mt-4 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                            <span className="text-xs text-gray-500">Analyzing visual patterns...</span>
                          </div>
                          <Progress value={undefined} className="h-2 bg-blue-100" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Error State - Visual Enhancement */}
            {analysisError && !isAnalyzingImage && (
              <div className="px-6 py-8">
                <div className="relative overflow-hidden bg-gradient-to-br from-red-500 via-orange-500 to-red-600 rounded-2xl p-1 shadow-2xl">
                  <div className="bg-white rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex-shrink-0">
                        <div className="relative">
                          <div className="absolute inset-0 bg-red-500 blur-xl opacity-60 rounded-full"></div>
                          <div className="relative bg-gradient-to-br from-red-500 to-orange-600 p-4 rounded-2xl shadow-lg">
                            <AlertCircle className="h-8 w-8 text-white" />
                          </div>
                        </div>
                      </div>
                      <div className="flex-1">
                        <Badge className="bg-red-500 text-white border-0 mb-2">
                          ERROR
                        </Badge>
                        <p className="font-black text-gray-900 text-lg">Analysis Error</p>
                        <div className="mt-3 p-3 bg-red-50 rounded-lg border-l-4 border-red-500">
                          <p className="text-sm text-red-800 font-medium">{analysisError}</p>
                        </div>
                        {onOpenAISettings && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-4 border-2 border-red-200 hover:bg-red-50 hover:border-red-300"
                            onClick={onOpenAISettings}
                          >
                            <Settings className="h-4 w-4 mr-2" />
                            Configure AI Settings
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Success State - Parsed Analysis */}
            {aiAnalysis && !isAnalyzingImage && !analysisError && (
              <div className="px-6 py-6 space-y-4">
                {/* Headline Card - Super Visual */}
                {headline && (
                  <div className="relative overflow-hidden bg-gradient-to-br from-amber-500 via-orange-500 to-red-500 rounded-2xl p-1 shadow-xl">
                    <div className="bg-white rounded-xl p-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                          <div className="relative">
                            <div className="absolute inset-0 bg-amber-500 blur-xl opacity-50 rounded-full"></div>
                            <div className="relative bg-gradient-to-br from-amber-400 to-orange-500 p-3 rounded-2xl shadow-lg">
                              <Zap className="w-7 h-7 text-white" />
                            </div>
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                              <Sparkles className="w-3 h-3 mr-1" />
                              KEY INSIGHT
                            </Badge>
                          </div>
                          <h2 className="text-xl font-extrabold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent leading-tight">
                            {headline.content}
                          </h2>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Parsed Sections - Enhanced Visual Style */}
                {parsedSections.map((section, idx) => {
                  if (section.type === 'headline') return null; // Already rendered above

                  if (section.type === 'section') {
                    return (
                      <div key={idx} className="mt-6 first:mt-0">
                        <div className={`flex items-center gap-3 mb-3 p-4 rounded-xl ${section.bgColor || 'bg-blue-50'} border-l-4 border-current ${section.color || 'text-blue-600'}`}>
                          <div className="flex-shrink-0">
                            {renderIcon(section.icon || 'info', `w-6 h-6 ${section.color || 'text-blue-600'}`)}
                          </div>
                          <h3 className="font-extrabold text-gray-900">{section.content}</h3>
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'bullet') {
                    return (
                      <div 
                        key={idx} 
                        className={`flex items-start gap-3 ${section.level === 2 ? 'ml-8' : 'ml-2'} my-3`}
                      >
                        <div className={`${section.level === 2 ? 'mt-1.5' : 'mt-1'} flex-shrink-0`}>
                          {section.level === 2 ? (
                            <div className="w-2 h-2 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                          ) : (
                            <div className="relative">
                              <div className="absolute inset-0 bg-green-400 blur-md opacity-40 rounded-full"></div>
                              <CheckCircle className="relative w-5 h-5 text-green-600 fill-green-50" />
                            </div>
                          )}
                        </div>
                        <div className={`flex-1 ${section.level === 2 ? 'bg-gray-50' : 'bg-gradient-to-r from-blue-50/50 to-transparent'} rounded-lg p-3 -ml-1`}>
                          <p className="text-sm text-gray-800 leading-relaxed font-medium">
                            {section.content}
                          </p>
                        </div>
                      </div>
                    );
                  }

                  if (section.type === 'text') {
                    return (
                      <div key={idx} className="my-3 ml-2">
                        <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-lg p-3 border-l-2 border-gray-300">
                          {section.content}
                        </p>
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            )}

            {/* Empty State - Visual Enhancement */}
            {!isAnalyzingImage && !aiAnalysis && !analysisError && (
              <div className="px-6 py-16 text-center">
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-purple-500 blur-2xl opacity-30 rounded-full"></div>
                  <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-6 rounded-3xl shadow-xl">
                    <Sparkles className="w-12 h-12 text-white" />
                  </div>
                </div>
                <p className="font-black text-gray-800 text-xl">No analysis available</p>
                <p className="text-sm text-gray-500 mt-2 max-w-xs mx-auto">
                  Configure AI settings and capture a screenshot to enable intelligent analysis
                </p>
                {onOpenAISettings && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-6 border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-semibold"
                    onClick={onOpenAISettings}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Configure AI Settings
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Footer - Enhanced Visual */}
          {aiAnalysis && !isAnalyzingImage && (
            <div className="border-t-2 border-gradient-to-r from-blue-200 to-purple-200 px-6 py-4 bg-gradient-to-r from-gray-50 to-blue-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="absolute inset-0 bg-green-400 blur-md opacity-40 rounded-full"></div>
                    <CheckCircle className="relative w-5 h-5 text-green-600 fill-green-50" />
                  </div>
                  <span className="text-sm font-semibold text-gray-700">Analysis complete</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-blue-200 hover:bg-blue-50 hover:border-blue-300 font-semibold shadow-sm"
                  onClick={() => {
                    const link = document.createElement('a');
                    link.download = `fusion-analysis-${new Date().toISOString().slice(0, 10)}.txt`;
                    link.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(aiAnalysis);
                    link.click();
                  }}
                >
                  Download Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
