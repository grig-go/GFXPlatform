import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { 
  Brain, Loader2, ChevronDown, ChevronRight, Search, Trash2, 
  TrendingUp, AlertTriangle, School, MapPin, Target, X
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { SchoolClosingsAIInsightsDialog } from "./SchoolClosingsAIInsightsDialog";

interface SchoolClosing {
  id?: number;
  provider_id: string;
  region_id: string;
  state: string | null;
  city: string | null;
  county_name: string | null;
  organization_name: string | null;
  type: string;
  status_day: string | null;
  status_description: string | null;
  notes: string | null;
  event_name: string | null;
  event_date: string | null;
  delay_duration: number | null;
  school_openings: boolean | null;
}

interface SavedInsight {
  id: string;
  question: string;
  response: string;
  model: string;
  closing_ids: number[];
  created_at: string;
}

interface SchoolClosingsAIInsightsProps {
  closings: SchoolClosing[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function SchoolClosingsAIInsights({ 
  closings, 
  compact = false, 
  listView = false,
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: SchoolClosingsAIInsightsProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalDialogOpen;
  const setIsDialogOpen = controlledOnOpenChange || setInternalDialogOpen;

  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load saved insights
  const loadSavedInsights = async () => {
    try {
      setLoadingInsights(true);
      const response = await fetch(
        getEdgeFunctionUrl('ai_insights/school-closings'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load saved insights');
      }

      const data = await response.json();
      
      // Transform database format to component format (matching Finance/News implementation)
      const transformedInsights = (data.insights || []).map((saved: any) => {
        const metadata = saved.metadata ? (typeof saved.metadata === 'string' ? JSON.parse(saved.metadata) : saved.metadata) : {};
        return {
          id: saved.id,
          question: metadata.question || saved.topic,
          response: metadata.response || saved.insight,
          model: metadata.model || 'Unknown',
          closing_ids: metadata.selectedClosings || [],
          created_at: saved.created_at
        };
      });
      
      setSavedInsights(transformedInsights);
      console.log(`[SchoolClosingsAIInsights] Loaded ${transformedInsights.length} saved school closing AI insights`);
    } catch (error) {
      console.error('[SchoolClosingsAIInsights] Error loading saved insights:', error);
      toast.error('Failed to load saved insights');
    } finally {
      setLoadingInsights(false);
    }
  };

  useEffect(() => {
    loadSavedInsights();
  }, []);

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl(`ai_insights/school-closings/${insightId}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete insight');
      }

      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
    } catch (error) {
      console.error('[SchoolClosingsAIInsights] Error deleting insight:', error);
      toast.error('Failed to delete insight');
    }
  };

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedInsights;
    }
    
    const query = searchQuery.toLowerCase();
    return savedInsights.filter(insight => 
      insight.question.toLowerCase().includes(query) ||
      insight.response.toLowerCase().includes(query)
    );
  }, [savedInsights, searchQuery]);

  // Compact mode - just the card (enhanced visual design)
  if (compact) {
    return (
      <>
        <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02]" onClick={onClick}>
          <CardContent className="p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {loadingInsights ? (
                  <>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg animate-pulse">
                      <Loader2 className="w-6 h-6 text-purple-600 dark:text-purple-400 animate-spin" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AI Insights</p>
                      <p className="text-2xl font-semibold">...</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                      <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">AI Insights</p>
                      <p className="text-2xl font-semibold">{savedInsights.length}</p>
                    </div>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">Saved analyses</p>
            </div>
          </CardContent>
        </Card>

        {/* Dialog controlled externally */}
        <SchoolClosingsAIInsightsDialog
          closings={closings}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onInsightSaved={loadSavedInsights}
          onInsightDeleted={loadSavedInsights}
        />
      </>
    );
  }

  // List view - expanded view with saved insights (enhanced visual design)
  if (listView) {
    return (
      <div className="space-y-4 border rounded-lg p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/10 dark:to-blue-950/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">AI School Closing Insights</h3>
            <Badge variant="secondary" className="text-sm">
              {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              Add AI Insights
            </Button>
            
            {/* Search */}
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </div>

        {/* Saved Insights */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No insights match your search' : 'No saved insights yet'}
            </p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
            {filteredInsights.map((insight, index) => {
              const response = insight.response || '';
              
              // Detect sentiment/urgency keywords
              const hasAlert = /emergency|severe|critical|alert|urgent|warning/i.test(response);
              const hasTrending = /increase|rising|surge|growing|trending|spike/i.test(response);
              
              // Extract key numbers
              const percentages = response.match(/(\d+)%/g) || [];
              const numbers = response.match(/(\d+)\s*(schools?|districts?|closures?|delays?)/gi) || [];
              
              // Extract preview text (first meaningful sentence)
              const sentences = response.split(/[.!?]\s+/);
              const preview = sentences.find(s => s.length > 20)?.substring(0, 100) || '';
              
              // Determine card styling based on sentiment
              const borderColor = hasAlert ? 'border-red-400' : 
                                 hasTrending ? 'border-blue-400' : 
                                 'border-purple-400';
              
              const bgGradient = hasAlert ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20' : 
                                hasTrending ? 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20' : 
                                'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20';
              
              const isExpanded = expandedInsights.has(insight.id);
              
              return (
                <Collapsible
                  key={insight.id || `insight-${index}`}
                  open={isExpanded}
                  onOpenChange={() => toggleInsightExpansion(insight.id)}
                >
                  <Card 
                    className={`border-l-4 ${borderColor} ${bgGradient} min-w-[380px] max-w-[380px] flex-shrink-0 snap-start shadow-md hover:shadow-lg transition-all ${!isExpanded ? 'h-[240px]' : ''}`}
                  >
                    <CardHeader className="pb-3 h-full flex flex-col">
                      <div className="flex items-start justify-between gap-2">
                        <CollapsibleTrigger className="flex items-start gap-2 flex-1 min-w-0 cursor-pointer hover:opacity-80 transition-opacity text-left">
                          <div className={`p-1.5 rounded-lg border shrink-0 ${
                            hasAlert 
                              ? 'bg-red-100 dark:bg-red-950/50 border-red-300 dark:border-red-700' 
                              : 'bg-purple-100 dark:bg-purple-950/50 border-purple-300 dark:border-purple-700'
                          }`}>
                            {isExpanded ? (
                              <ChevronDown className={`w-4 h-4 ${hasAlert ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            ) : (
                              <ChevronRight className={`w-4 h-4 ${hasAlert ? 'text-red-600 dark:text-red-400' : 'text-purple-600 dark:text-purple-400'}`} />
                            )}
                          </div>
                          <div className="flex-1">
                            <CardTitle className="text-base leading-tight line-clamp-2 mb-2">{insight.question}</CardTitle>
                          </div>
                        </CollapsibleTrigger>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteInsight(insight.id);
                          }}
                          className="h-7 w-7 shrink-0 inline-flex items-center justify-center rounded-md hover:bg-destructive/10 transition-colors"
                          aria-label="Delete insight"
                        >
                          <X className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                        </button>
                      </div>

                      {/* Collapsed Content Container */}
                      {!isExpanded && (
                        <div className="flex-1 flex flex-col justify-between min-h-0">
                          <div className="space-y-2">
                            {/* Status Banner - Always visible when not expanded */}
                            {hasAlert && (
                              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-100 dark:bg-red-950/40 border border-red-300 dark:border-red-700">
                                <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
                                <span className="text-xs font-semibold text-red-700 dark:text-red-300">Critical Alert</span>
                              </div>
                            )}
                            
                            {/* Preview Text - When not expanded */}
                            {preview && (
                              <p className="text-sm text-muted-foreground line-clamp-2">
                                {preview}...
                              </p>
                            )}
                          </div>
                          
                          {/* Metadata Row - Always at bottom */}
                          <div className="flex items-center gap-2 flex-wrap pt-2 mt-auto">
                            <Badge variant="outline" className="text-xs">
                              <School className="w-3 h-3 mr-1" />
                              {insight.closing_ids?.length || 0}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(insight.created_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      )}
                      
                      {/* Metadata Row - When expanded */}
                      {isExpanded && (
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                          <Badge variant="outline" className="text-xs">
                            <School className="w-3 h-3 mr-1" />
                            {insight.closing_ids?.length || 0}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </CardHeader>

                    <CollapsibleContent>
                      <CardContent className="pt-0 space-y-3">
                        {/* Key Metrics Grid */}
                        {(percentages.length > 0 || numbers.length > 0) && (
                          <div className="grid grid-cols-2 gap-2">
                            {percentages.slice(0, 2).map((pct, idx) => (
                              <div key={`pct-${idx}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-950/40 dark:to-purple-900/20 border border-purple-200 dark:border-purple-700">
                                <Target className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{pct}</span>
                              </div>
                            ))}
                            {numbers.slice(0, 2).map((num, idx) => (
                              <div key={`num-${idx}`} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-950/40 dark:to-blue-900/20 border border-blue-200 dark:border-blue-700">
                                <School className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0" />
                                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300 truncate">{num}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {/* Full Response */}
                        <div className="p-4 rounded-lg bg-white/80 dark:bg-black/20 border">
                          <div className="prose prose-sm max-w-none dark:prose-invert">
                            <div className="space-y-2">
                              {response.split('\n').map((line, lineIdx) => {
                                if (!line.trim()) return null;
                                
                                // Check if it's a numbered bullet point
                                const bulletMatch = line.match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/);
                                if (bulletMatch) {
                                  const [, number, title, content] = bulletMatch;
                                  return (
                                    <div key={lineIdx} className="flex gap-2">
                                      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                                        {number}
                                      </div>
                                      <div className="flex-1">
                                        <p className="font-semibold text-sm">{title}</p>
                                        {content && <p className="text-xs text-muted-foreground mt-0.5">{content}</p>}
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Regular bullet points
                                if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                                  return (
                                    <div key={lineIdx} className="flex gap-2 pl-2">
                                      <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                                      <p className="text-sm flex-1">{line.replace(/^[-•]\s*/, '')}</p>
                                    </div>
                                  );
                                }
                                
                                return (
                                  <p key={lineIdx} className="text-sm">{line}</p>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}

        {/* Dialog */}
        <SchoolClosingsAIInsightsDialog
          closings={closings}
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onInsightSaved={loadSavedInsights}
          onInsightDeleted={loadSavedInsights}
        />
      </div>
    );
  }

  // Default - just the dialog (shouldn't be used, but here for completeness)
  return (
    <SchoolClosingsAIInsightsDialog
      closings={closings}
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
    />
  );
}