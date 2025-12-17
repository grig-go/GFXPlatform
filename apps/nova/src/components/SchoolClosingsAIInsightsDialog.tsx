import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { 
  Brain, Send, Loader2, X, School, Save
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

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

interface SchoolClosingsAIInsightsDialogProps {
  closings: SchoolClosing[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInsightSaved?: () => void;
  onInsightDeleted?: () => void;
}

export function SchoolClosingsAIInsightsDialog({ 
  closings, 
  open, 
  onOpenChange, 
  onInsightSaved, 
  onInsightDeleted 
}: SchoolClosingsAIInsightsDialogProps) {
  const [selectedClosings, setSelectedClosings] = useState<number[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);

  // Load AI provider assigned to school closings dashboard
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
        
        // Find provider assigned to school closings dashboard
        const schoolClosingsProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'school-closings' && d.textProvider
          )
        );

        if (schoolClosingsProvider) {
          setAiProvider(schoolClosingsProvider);
          console.log('School Closings AI Provider loaded:', schoolClosingsProvider.name);
        } else {
          console.warn('No AI provider assigned to school closings dashboard');
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

  const toggleClosingSelection = (closingId: number) => {
    setSelectedClosings(prev => 
      prev.includes(closingId)
        ? prev.filter(id => id !== closingId)
        : [...prev, closingId]
    );
  };

  const clearAllClosings = () => {
    setSelectedClosings([]);
  };

  const selectAllClosings = () => {
    setSelectedClosings(closings.filter(c => c.id).map(c => c.id!));
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for school closings dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected closings
      let context = 'You are a helpful school closings AI assistant analyzing school closings and delays. Please provide 3-10 insightful bullet points with short sentences containing specific patterns, trends, and observations. Focus on actionable insights with concrete observations.\n\n';
      
      if (selectedClosings.length > 0) {
        context += `Selected School Closings (${selectedClosings.length}):\n`;
        selectedClosings.forEach(closingId => {
          const closing = closings.find(c => c.id === closingId);
          if (closing) {
            context += `- ${closing.organization_name || 'Unknown'} (${closing.type})\n`;
            context += `  State: ${closing.state || 'N/A'}, County: ${closing.county_name || 'N/A'}, City: ${closing.city || 'N/A'}\n`;
            context += `  Status: ${closing.status_description || 'N/A'} - ${closing.status_day || 'N/A'}\n`;
            if (closing.notes) {
              context += `  Notes: ${closing.notes.substring(0, 150)}...\n`;
            }
          }
        });
        context += '\n';
      } else {
        context += `Analyzing all ${closings.length} school closings.\n\n`;
      }

      console.log('Sending school closings AI request:', {
        providerId: aiProvider.id,
        providerName: aiProvider.name,
        dashboard: 'school_closings',
        messageLength: chatMessage.length,
        contextLength: context.length,
        selectedClosingsCount: selectedClosings.length
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
            dashboard: 'school_closings',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ School Closings AI error response:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // Handle quota errors specially
        if (response.status === 429 || errorData.isQuotaError) {
          const quotaMessage = errorData.error || errorData.details || 'API quota exceeded';
          
          toast.error(
            <div className="space-y-2">
              <p className="font-medium">API Quota Exceeded</p>
              <p className="text-sm whitespace-pre-line">{quotaMessage}</p>
            </div>,
            { duration: 10000 }
          );
          throw new Error(quotaMessage);
        }
        
        const errorMessage = errorData.detail || errorData.error || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('School Closings AI response received:', {
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
        getEdgeFunctionUrl('ai_insights/school-closings'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedClosings: selectedClosings.length > 0 ? selectedClosings : closings.filter(c => c.id).map(c => c.id),
            aiProvider: aiProvider?.name || 'Unknown',
            model: currentModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save insight');
      }

      const data = await response.json();
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader className="space-y-0 pb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <DialogTitle>School Closings AI Insight Generator</DialogTitle>
          </div>
          <DialogDescription>
            Select school closings and ask the AI assistant for analysis, patterns, and insights.
          </DialogDescription>
        </DialogHeader>
        
        {/* School Closings selection */}
        <div className="space-y-2 relative flex-1 min-h-0">
          <div className="flex items-center justify-between">
            <label className="text-sm">School Closings ({selectedClosings.length} selected)</label>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllClosings}
              >
                Select All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllClosings}
              >
                Clear
              </Button>
            </div>
          </div>
          
          <ScrollArea className="h-[500px] border rounded-md">
            <div className="p-2 space-y-2">
              {closings.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No school closings available
                </p>
              ) : (
                closings.map((closing) => (
                  <div
                    key={closing.id}
                    className="flex items-start space-x-2 p-2 hover:bg-muted rounded-md cursor-pointer"
                    onClick={() => toggleClosingSelection(closing.id!)}
                  >
                    <Checkbox
                      id={`closing-${closing.id}`}
                      checked={selectedClosings.includes(closing.id!)}
                      onCheckedChange={() => toggleClosingSelection(closing.id!)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor={`closing-${closing.id}`}
                      className="flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <School className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm line-clamp-1">{closing.organization_name || 'Unknown'}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {closing.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {closing.city || 'N/A'}, {closing.state || 'N/A'} • {closing.status_description || 'N/A'}
                        </span>
                      </div>
                    </label>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>

          {/* AI Response - OVERLAYS SCHOOL CLOSINGS SELECTION */}
          {aiResponse && (
            <div className="absolute inset-0 z-10">
              <div className="relative h-full border-2 border-purple-300 dark:border-purple-700 rounded-xl p-6 bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 dark:from-purple-950 dark:via-pink-950 dark:to-blue-950 shadow-2xl flex flex-col">
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
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
                      <Brain className="w-5 h-5 text-white flex-shrink-0" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm mb-2">
                        <strong className="text-purple-900 dark:text-purple-100">Question:</strong>{" "}
                        <span className="text-purple-800 dark:text-purple-200">{currentQuestion}</span>
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="text-xs bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700">
                          <Brain className="w-3 h-3 mr-1" />
                          {currentModel}
                        </Badge>
                        <Badge variant="outline" className="text-xs bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700">
                          <School className="w-3 h-3 mr-1" />
                          {selectedClosings.length > 0 ? selectedClosings.length : closings.length} Closings
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Response content with visual formatting */}
                <div className="flex-1 min-h-0 mb-4">
                  <ScrollArea className="h-full">
                    <div className="bg-white/80 dark:bg-purple-950/60 rounded-xl p-6 border-2 border-purple-200 dark:border-purple-800 mr-4 shadow-inner">
                      {/* Visual header */}
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b-2 border-purple-200 dark:border-purple-700">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
                          <div className="w-2 h-2 rounded-full bg-pink-500 animate-pulse delay-75"></div>
                          <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse delay-150"></div>
                        </div>
                        <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                          AI Analysis Results
                        </h3>
                      </div>
                      
                      {/* Enhanced response display */}
                      <div className="space-y-4">
                        {aiResponse.split('\n').map((line, index) => {
                          if (!line.trim()) return null;
                          
                          // Check if it's a numbered bullet point
                          const bulletMatch = line.match(/^(\d+)\.\s*\*\*(.+?)\*\*:?\s*(.*)$/);
                          if (bulletMatch) {
                            const [, number, title, content] = bulletMatch;
                            return (
                              <div key={index} className="flex gap-3 group">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                  {number}
                                </div>
                                <div className="flex-1 bg-gradient-to-r from-purple-50 to-transparent dark:from-purple-900/20 dark:to-transparent rounded-lg p-3 border-l-4 border-purple-400 dark:border-purple-600">
                                  <p className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
                                    {title}
                                  </p>
                                  {content && (
                                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                                      {content}
                                    </p>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          // Check if it's just a bold header
                          const headerMatch = line.match(/^\*\*(.+?)\*\*:?$/);
                          if (headerMatch) {
                            return (
                              <div key={index} className="flex items-center gap-2 mt-3">
                                <div className="h-0.5 w-8 bg-gradient-to-r from-purple-500 to-pink-500"></div>
                                <h4 className="font-semibold text-purple-900 dark:text-purple-100">
                                  {headerMatch[1]}
                                </h4>
                              </div>
                            );
                          }
                          
                          // Regular line with icon
                          if (line.trim().startsWith('-') || line.trim().startsWith('•')) {
                            return (
                              <div key={index} className="flex gap-2 pl-4">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-2 flex-shrink-0"></div>
                                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed flex-1">
                                  {line.replace(/^[-•]\s*/, '')}
                                </p>
                              </div>
                            );
                          }
                          
                          // Default paragraph
                          return (
                            <p key={index} className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                              {line}
                            </p>
                          );
                        })}
                      </div>
                      
                      {/* Visual footer with stats */}
                      <div className="mt-6 pt-4 border-t-2 border-purple-200 dark:border-purple-700 grid grid-cols-3 gap-4">
                        <div className="bg-gradient-to-br from-purple-100 to-purple-50 dark:from-purple-900/40 dark:to-purple-800/20 rounded-lg p-3 border border-purple-200 dark:border-purple-700">
                          <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                            <span className="text-xs text-purple-700 dark:text-purple-300 font-medium">Analyzed</span>
                          </div>
                          <p className="text-lg font-bold text-purple-900 dark:text-purple-100 mt-1">
                            {selectedClosings.length > 0 ? selectedClosings.length : closings.length}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-pink-100 to-pink-50 dark:from-pink-900/40 dark:to-pink-800/20 rounded-lg p-3 border border-pink-200 dark:border-pink-700">
                          <div className="flex items-center gap-2">
                            <Brain className="w-4 h-4 text-pink-600 dark:text-pink-400" />
                            <span className="text-xs text-pink-700 dark:text-pink-300 font-medium">Model</span>
                          </div>
                          <p className="text-xs font-bold text-pink-900 dark:text-pink-100 mt-1 truncate">
                            {currentModel}
                          </p>
                        </div>
                        <div className="bg-gradient-to-br from-blue-100 to-blue-50 dark:from-blue-900/40 dark:to-blue-800/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
                          <div className="flex items-center gap-2">
                            <Save className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                            <span className="text-xs text-blue-700 dark:text-blue-300 font-medium">Status</span>
                          </div>
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-100 mt-1">
                            {insightSaved ? 'Saved ✓' : 'Unsaved'}
                          </p>
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
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white shadow-lg"
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

        {/* Chat Input */}
        <div className="space-y-2 pt-4 border-t flex-shrink-0">
          <label className="text-sm">Your Question</label>
          <Textarea
            placeholder="Ask the AI about patterns, trends, or insights in the school closings data..."
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
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
          {!aiProvider && !loadingProvider && (
            <p className="text-xs text-muted-foreground">
              Please configure an AI provider for the school closings dashboard in AI Connections.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}