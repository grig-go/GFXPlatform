import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Article } from "../utils/useNewsFeed";
import { 
  Brain, Loader2, ChevronDown, ChevronRight, Search, Trash2, 
  TrendingUp, AlertTriangle, Newspaper, Globe, Target, X
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { NewsAIInsightsDialog } from "./NewsAIInsightsDialog";

interface SavedInsight {
  id: string;
  question: string;
  response: string;
  model: string;
  article_ids: string[];
  created_at: string;
}

interface NewsAIInsightsProps {
  articles: Article[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function NewsAIInsights({ 
  articles, 
  compact = false, 
  listView = false,
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange
}: NewsAIInsightsProps) {
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
        getEdgeFunctionUrl('ai_insights/news'),
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
      
      // Transform database format to component format (matching Finance implementation)
      const transformedInsights = (data.insights || []).map((saved: any) => {
        const metadata = saved.metadata ? (typeof saved.metadata === 'string' ? JSON.parse(saved.metadata) : saved.metadata) : {};
        return {
          id: saved.id,
          question: metadata.question || saved.topic,
          response: metadata.response || saved.insight,
          model: metadata.model || 'Unknown',
          article_ids: metadata.selectedArticles || [],
          created_at: saved.created_at
        };
      });
      
      setSavedInsights(transformedInsights);
      console.log(`[NewsAIInsights] Loaded ${transformedInsights.length} saved news AI insights`);
    } catch (error) {
      console.error('[NewsAIInsights] Error loading saved insights:', error);
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
        getEdgeFunctionUrl(`ai_insights/news/${insightId}`),
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
      console.error('[NewsAIInsights] Error deleting insight:', error);
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
        <NewsAIInsightsDialog
          articles={articles}
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
            <h3 className="text-lg font-semibold">AI News Insights</h3>
            <Badge variant="secondary" className="text-sm">
              {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
            </Badge>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search insights..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-[250px]"
              />
            </div>
            
            <Button 
              variant="default" 
              size="sm"
              onClick={() => setIsDialogOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
            >
              <Brain className="w-4 h-4 mr-2" />
              Add AI Insights
            </Button>
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
              const hasAlert = /breaking|urgent|crisis|alert|critical/i.test(response);
              const hasTrending = /trending|surge|spike|increase|growing|rising/i.test(response);
              
              // Extract key numbers
              const percentages = response.match(/(\d+)%/g) || [];
              const numbers = response.match(/(\d+)\s*(articles?|sources?|stories|mentions?)/gi) || [];
              
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
                              <Newspaper className="w-3 h-3 mr-1" />
                              {insight.article_ids?.length || 0}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              <Globe className="w-3 h-3 mr-1" />
                              {insight.model}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {new Date(insight.created_at).toLocaleDateString()}
                            </Badge>
                          </div>
                        </div>
                      )}
                      
                      {/* Metadata Row - When expanded */}
                      {isExpanded && (
                        <div className="flex items-center gap-2 flex-wrap pt-2">
                          <Badge variant="outline" className="text-xs">
                            <Newspaper className="w-3 h-3 mr-1" />
                            {insight.article_ids?.length || 0}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Globe className="w-3 h-3 mr-1" />
                            {insight.model}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {new Date(insight.created_at).toLocaleDateString()}
                          </Badge>
                        </div>
                      )}
                    </CardHeader>

                    {/* Expanded Content */}
                    <CollapsibleContent>
                      <CardContent className="pt-0 pb-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="bg-purple-50 dark:bg-purple-950/20 p-3 rounded-lg border border-purple-200 dark:border-purple-800">
                            <div className="text-sm whitespace-pre-wrap leading-relaxed">
                              {insight.response}
                            </div>
                          </div>
                          
                          {/* Metadata in expanded view */}
                          <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Newspaper className="w-3.5 h-3.5" />
                              <span>{insight.article_ids?.length || 0} articles analyzed</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Globe className="w-3.5 h-3.5" />
                              <span>{insight.model}</span>
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

        <NewsAIInsightsDialog
          articles={articles}
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
    <NewsAIInsightsDialog
      articles={articles}
      open={isDialogOpen}
      onOpenChange={setIsDialogOpen}
    />
  );
}