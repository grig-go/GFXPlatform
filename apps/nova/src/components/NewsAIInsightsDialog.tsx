import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Article } from "../utils/useNewsFeed";
import { 
  Brain, Send, Loader2, X, Newspaper, ChevronDown, ChevronRight,
  Save, Trash2, Search, ExternalLink
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { Input } from "./ui/input";

interface SavedInsight {
  id: string;
  question: string;
  response: string;
  model: string;
  article_ids: string[];
  created_at: string;
}

interface NewsAIInsightsDialogProps {
  articles: Article[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsightSaved?: () => void;
  onInsightDeleted?: () => void;
}

export function NewsAIInsightsDialog({ articles, open, onOpenChange, onInsightSaved, onInsightDeleted }: NewsAIInsightsDialogProps) {
  const [selectedArticles, setSelectedArticles] = useState<string[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);
  const [savedInsights, setSavedInsights] = useState<SavedInsight[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load AI provider assigned to news dashboard
  useEffect(() => {
    const loadAIProvider = async () => {
      try {
        setLoadingProvider(true);
        const response = await fetch(
          getEdgeFunctionUrl('ai_provider/providers'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to load AI providers');
        }

        const data = await response.json();
        
        // Find provider assigned to news dashboard
        const newsProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'news' && d.textProvider
          )
        );

        if (newsProvider) {
          setAiProvider(newsProvider);
          console.log('News AI Provider loaded:', newsProvider.name);
        } else {
          console.warn('No AI provider assigned to news dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    if (open) {
      loadAIProvider();
    }
  }, [open]);

  // Load saved insights
  useEffect(() => {
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
        setSavedInsights(data.insights || []);
        console.log(`Loaded ${data.insights?.length || 0} saved news AI insights`);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        toast.error('Failed to load saved insights');
      } finally {
        setLoadingInsights(false);
      }
    };

    if (open) {
      loadSavedInsights();
    }
  }, [open]);

  const toggleArticleSelection = (articleId: string) => {
    setSelectedArticles(prev => 
      prev.includes(articleId)
        ? prev.filter(id => id !== articleId)
        : [...prev, articleId]
    );
  };

  const clearAllArticles = () => {
    setSelectedArticles([]);
  };

  const selectAllArticles = () => {
    setSelectedArticles(articles.map(a => a.id));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for news dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected articles
      let context = 'You are a helpful news AI assistant analyzing news articles. Please provide 3-10 insightful bullet points with short sentences containing specific themes, trends, and patterns. Focus on actionable insights with concrete observations.\\n\\n';
      
      if (selectedArticles.length > 0) {
        context += `Selected Articles (${selectedArticles.length}):\\n`;
        selectedArticles.forEach(articleId => {
          const article = articles.find(a => a.id === articleId);
          if (article) {
            context += `- "${article.title}" (${article.provider.toUpperCase()}, ${article.sourceName || 'Unknown source'})\\n`;
            if (article.description) {
              context += `  ${article.description.substring(0, 150)}...\\n`;
            }
          }
        });
        context += '\\n';
      } else {
        context += `Analyzing all ${articles.length} articles.\\n\\n`;
      }

      console.log('Sending news AI request:', {
        providerId: aiProvider.id,
        providerName: aiProvider.name,
        dashboard: 'news',
        messageLength: chatMessage.length,
        contextLength: context.length,
        selectedArticlesCount: selectedArticles.length
      });

      const response = await fetch(
        getEdgeFunctionUrl('ai_insights/chat'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            providerId: aiProvider.id,
            message: chatMessage,
            context: context,
            dashboard: 'news',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ News AI error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // Handle quota errors specially
        if (response.status === 429 || errorData.isQuotaError) {
          const quotaMessage = errorData.error || errorData.details || 'API quota exceeded';
          
          // Show a more prominent error with line breaks
          toast.error(
            <div className="space-y-2">
              <p className="font-medium">API Quota Exceeded</p>
              <p className="text-sm whitespace-pre-line">{quotaMessage}</p>
            </div>,
            { duration: 10000 } // Show for 10 seconds
          );
          throw new Error(quotaMessage);
        }
        
        // Extract detailed error message
        const errorMessage = errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('News AI response received:', {
        provider: data.provider,
        modelUsed: data.model,
        responseLength: data.response?.length
      });

      setAiResponse(data.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(data.model || aiProvider.model || 'Unknown');
      setInsightSaved(false);
      toast.success(`Response from ${data.provider}`);
      setChatMessage("");
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      // Only show toast if not already shown for quota error
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      if (!errorMessage.includes('quota') && !errorMessage.includes('429')) {
        toast.error(`AI Error: ${errorMessage}`);
      }
    } finally {
      setSendingMessage(false);
    }
  };

  const handleSaveInsight = async () => {
    if (!aiResponse || !currentQuestion) return;

    try {
      setSavingInsight(true);
      const response = await fetch(
        getEdgeFunctionUrl('ai_insights/news'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedArticles: selectedArticles.length > 0 ? selectedArticles : articles.map(a => a.id),
            aiProvider: aiProvider?.name || 'Unknown',
            model: currentModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save insight');
      }

      const data = await response.json();
      setSavedInsights(prev => [data.data, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully');
      
      // Notify parent to refresh
      if (onInsightSaved) {
        onInsightSaved();
      }
    } catch (error) {
      console.error('Error saving insight:', error);
      toast.error('Failed to save insight');
    } finally {
      setSavingInsight(false);
    }
  };

  const handleDeleteInsight = async (insightId: string) => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('ai_insights/news/${insightId}'),
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
      
      // Notify parent to refresh
      if (onInsightDeleted) {
        onInsightDeleted();
      }
    } catch (error) {
      console.error('Error deleting insight:', error);
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

  const filteredSavedInsights = savedInsights.filter(insight =>
    searchQuery === "" ||
    insight.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
    insight.response.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader className="space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <DialogTitle>News AI Insight Generator</DialogTitle>
          </div>
          <DialogDescription>
            Select articles and ask the AI assistant for news analysis, trends, and insights.
          </DialogDescription>
        </DialogHeader>
        
        {/* Article selection */}
        <div className="space-y-2 relative">
          <div className="flex items-center justify-between">
            <label className="text-sm">Articles ({selectedArticles.length} selected)</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllArticles}
                disabled={selectedArticles.length === articles.length}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllArticles}
                disabled={selectedArticles.length === 0}
              >
                Clear
              </Button>
            </div>
          </div>
          <ScrollArea className="h-[400px] border rounded-md">
            <div className="p-2 space-y-1">
              {articles.map((article) => (
                <div
                  key={article.id}
                  className="flex items-start gap-2 p-2 cursor-pointer hover:bg-accent rounded-sm"
                  onClick={() => toggleArticleSelection(article.id)}
                >
                  <Checkbox
                    checked={selectedArticles.includes(article.id)}
                    onCheckedChange={() => toggleArticleSelection(article.id)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <Newspaper className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-sm line-clamp-1">{article.title}</p>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {article.provider.toUpperCase()}
                      </Badge>
                      {article.sourceName && (
                        <span className="text-xs text-muted-foreground">{article.sourceName}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* AI Response - OVERLAYS ARTICLE SELECTION */}
          {aiResponse && (
            <div className="absolute inset-0 z-10">
              <div className="relative h-full border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 bg-gradient-to-br from-purple-50 via-purple-100 to-blue-50 dark:from-purple-950 dark:via-purple-900 dark:to-blue-950 shadow-lg flex flex-col">
                {/* Close button */}
                <button
                  onClick={() => {
                    setAiResponse(null);
                    setCurrentQuestion("");
                    setCurrentModel("");
                    setInsightSaved(false);
                  }}
                  className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-purple-200/50 dark:hover:bg-purple-900/50 transition-colors z-20"
                  aria-label="Clear response"
                >
                  <X className="w-4 h-4 text-purple-700 dark:text-purple-400" />
                </button>

                {/* Header with question */}
                <div className="pr-8 mb-4 flex-shrink-0">
                  <div className="flex items-start gap-2">
                    <Brain className="w-5 h-5 text-purple-600 dark:text-purple-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm mb-1">
                        <strong className="text-purple-900 dark:text-purple-100">Question:</strong> <span className="text-purple-800 dark:text-purple-200">{currentQuestion}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700">
                          Model: {currentModel}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700">
                          <Newspaper className="w-3 h-3 mr-1" />
                          {selectedArticles.length || articles.length} Articles
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response content with scroll */}
                <div className="flex-1 min-h-0 mb-4">
                  <ScrollArea className="h-full">
                    <div className="bg-white/60 dark:bg-purple-950/40 rounded-lg p-4 border border-purple-200 dark:border-purple-800 mr-4">
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-900 dark:text-gray-100">
                          {aiResponse}
                        </div>
                      </div>
                    </div>
                  </ScrollArea>
                </div>

                {/* Save button */}
                <div className="flex justify-end flex-shrink-0">
                  <Button
                    onClick={handleSaveInsight}
                    disabled={savingInsight || insightSaved}
                    className="bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600"
                  >
                    {savingInsight ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : insightSaved ? (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat interface */}
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm">Ask AI Assistant</label>
            <Textarea
              placeholder="E.g., What are the main themes? Any emerging trends?"
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              rows={3}
              disabled={loadingProvider || sendingMessage}
            />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || loadingProvider || sendingMessage || !aiProvider}
              className="flex-1"
            >
              {sendingMessage ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Generate Insight
                </>
              )}
            </Button>
            {!aiProvider && !loadingProvider && (
              <Button variant="outline" disabled>
                No AI Provider
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}