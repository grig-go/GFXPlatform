import { useState, useMemo, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { FinanceSecurityWithSnapshot } from "../types/finance";
import { 
  Brain, ChevronDown, ChevronRight, Coins, Building2, BarChart3,
  Send, X, Loader2, Search
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface AIInsight {
  id: string;
  type: string;
  severity: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  title: string;
  shortDescription: string;
  trend: 'warning' | 'positive' | 'info';
  probability: number; // 0-100
  confidence: number; // 0-100
  state?: 'active' | 'cooling-off' | 'muted';
  coolingOffMinutes?: number;
  rulesFired?: Rule[];
  keyMetrics?: KeyMetric[];
  details?: {
    affectedSecurities?: any[];
    recommendations?: string[];
  };
  isMuted?: boolean;
  autoNotifyThreshold?: number;
}

interface Rule {
  id: string;
  name: string;
  condition: string;
  value: number;
  threshold: number;
  unit?: string;
  weight: number;
}

interface KeyMetric {
  name: string;
  value: number;
  unit: string;
  threshold?: number;
  status: 'normal' | 'warning' | 'critical';
}

interface FinanceAIInsightsProps {
  securities: FinanceSecurityWithSnapshot[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  preselectedSecurityId?: string; // Prefill the asset selection with this security ID
  onDialogClose?: () => void; // Callback when the dialog closes
}

export function FinanceAIInsights({ securities, compact = false, listView = false, onClick, preselectedSecurityId, onDialogClose }: FinanceAIInsightsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAssetPopoverOpen, setIsAssetPopoverOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<string>("");
  const [selectedAssetType, setSelectedAssetType] = useState<string[]>([]);
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<string>("");
  const [currentModel, setCurrentModel] = useState<string>("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);
  const [savedInsights, setSavedInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Ref for the asset dropdown container
  const assetDropdownRef = useRef<HTMLDivElement>(null);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target as Node)) {
        setIsAssetPopoverOpen(false);
      }
    };

    if (isAssetPopoverOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAssetPopoverOpen]);

  // Handle preselected security
  useEffect(() => {
    if (preselectedSecurityId && securities.length > 0) {
      // Check if the security exists in our list
      const securityExists = securities.some(s => s.security.id === preselectedSecurityId);
      if (securityExists) {
        setSelectedAssetType([preselectedSecurityId]); // Fix: use selectedAssetType instead of selectedSecurities
        setIsDialogOpen(true); // Open the dialog automatically
      }
    }
  }, [preselectedSecurityId, securities]);

  // Load AI provider assigned to finance dashboard
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
        
        // Find provider assigned to finance dashboard
        const financeProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'finance' && d.textProvider
          )
        );

        if (financeProvider) {
          setAiProvider(financeProvider);
          console.log('Finance AI Provider loaded:', financeProvider.name);
        } else {
          console.warn('No AI provider assigned to finance dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    loadAIProvider();
  }, []);

  // Load saved insights
  useEffect(() => {
    const loadSavedInsights = async () => {
      try {
        setLoadingInsights(true);
        const response = await fetch(
          getEdgeFunctionUrl('ai_insights/finance'),
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
        console.log(`Loaded ${data.insights?.length || 0} saved finance AI insights`);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        toast.error('Failed to load saved insights');
      } finally {
        setLoadingInsights(false);
      }
    };

    loadSavedInsights();
  }, []);

  // Get available indices and security types
  const availableIndices = useMemo(() => 
    securities.filter(s => s.security.type === 'INDEX')
  , [securities]);

  const availableSecurities = useMemo(() => 
    securities.filter(s => s.security.type !== 'INDEX')
  , [securities]);

  const toggleAssetSelection = (assetId: string) => {
    setSelectedAssetType(prev => 
      prev.includes(assetId)
        ? prev.filter(id => id !== assetId)
        : [...prev, assetId]
    );
  };

  const clearAllAssets = () => {
    setSelectedAssetType([]);
  };

  const getSelectedAssetName = (assetId: string) => {
    const security = availableSecurities.find(s => s.security.id === assetId);
    return security ? security.security.name.value : assetId;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for finance dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected index and assets
      let context = 'You are a helpful financial AI assistant analyzing market data. Please provide 3-10 insightful bullet points with short sentences containing specific percentages, probabilities, ratios, and quantifiable metrics that can be easily visualized. Format for easy visualization (e.g., "65% probability", "Risk: 3/10", "12% upside potential", "Support level: $145"). Focus on actionable, data-rich insights with concrete numbers.\n\n';
      
      if (selectedIndex) {
        const indexData = availableIndices.find(i => i.security.id === selectedIndex);
        if (indexData) {
          context += `Selected Index/Benchmark: ${indexData.security.name.value} (${getSecuritySymbol(indexData)})\n`;
          context += `Current Price: ${indexData.snapshot.last.value.toFixed(2)}\n`;
          context += `Change: ${indexData.snapshot.changePct.value > 0 ? '+' : ''}${indexData.snapshot.changePct.value.toFixed(2)}%\n\n`;
        }
      }

      if (selectedAssetType.length > 0) {
        context += `Selected Assets:\n`;
        selectedAssetType.forEach(assetId => {
          const asset = availableSecurities.find(s => s.security.id === assetId);
          if (asset) {
            context += `- ${asset.security.name.value} (${getSecuritySymbol(asset)}): ${asset.snapshot.last.value.toFixed(2)}, ${asset.snapshot.changePct.value > 0 ? '+' : ''}${asset.snapshot.changePct.value.toFixed(2)}%\n`;
          }
        });
        context += '\n';
      }

      context += `User Question: ${chatMessage}`;

      console.log('Sending AI request with context:', context);

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
            dashboard: 'finance',
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        
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
        
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      setAiResponse(data.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(data.model || aiProvider.model);
      setInsightSaved(false);
      toast.success(`Response from ${data.provider}`);
      setChatMessage("");
      
    } catch (error) {
      console.error('Error sending AI message:', error);
      
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
        getEdgeFunctionUrl('ai_insights/finance'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedIndex: selectedIndex || null,
            selectedAssets: selectedAssetType,
            aiProvider: aiProvider?.name || 'Unknown',
            model: currentModel,
            insightType: 'all',
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save insight');
      }

      const data = await response.json();
      setSavedInsights(prev => [data.data, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully!');
      
      // Close the dialog after successful save
      setTimeout(() => {
        setIsDialogOpen(false);
      }, 500);
      
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
        getEdgeFunctionUrl('ai_insights/finance/${insightId}'),
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
      console.error('Error deleting insight:', error);
      toast.error('Failed to delete insight');
    }
  };

  const getSecurityIcon = (type: string) => {
    switch (type) {
      case 'CRYPTO': return <Coins className="w-4 h-4 text-yellow-600" />;
      case 'INDEX': return <BarChart3 className="w-4 h-4 text-blue-600" />;
      default: return <Building2 className="w-4 h-4 text-green-600" />;
    }
  };

  const getSecuritySymbol = (security: FinanceSecurityWithSnapshot) => {
    return security.security.symbol || security.security.cgId || security.security.uniqueKey;
  };

  const handleSecurityToggle = (securityId: string) => {
    setSelectedSecurities(prev => 
      prev.includes(securityId) 
        ? prev.filter(id => id !== securityId)
        : [...prev, securityId]
    );
  };

  // Generate insights from saved AI responses only
  const insights = useMemo(() => {
    const results: AIInsight[] = [];

    // Add saved insights as AI-generated insights
    savedInsights.forEach((saved) => {
      const metadata = saved.metadata ? (typeof saved.metadata === 'string' ? JSON.parse(saved.metadata) : saved.metadata) : {};
      results.push({
        id: saved.id,
        type: 'AI_SAVED',
        severity: 'low',
        icon: <Brain className="w-4 h-4 text-purple-600" />,
        title: saved.topic,
        shortDescription: saved.insight.length > 150 
          ? saved.insight.substring(0, 150) + '...' 
          : saved.insight,
        trend: 'info',
        probability: 0,
        confidence: 0,
        details: {
          fullResponse: saved.insight,
          provider: metadata.aiProvider,
          model: metadata.model,
          createdAt: saved.created_at,
          selectedIndex: metadata.selectedIndex,
          selectedAssets: metadata.selectedAssets,
        }
      });
    });

    return results;
  }, [savedInsights]);

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) {
      return insights;
    }
    
    const query = searchQuery.toLowerCase();
    return insights.filter(insight => 
      insight.title.toLowerCase().includes(query) ||
      insight.shortDescription.toLowerCase().includes(query) ||
      insight.details?.fullResponse?.toLowerCase().includes(query)
    );
  }, [insights, searchQuery]);



  if (compact) {
    return (
      <Card className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] h-full" onClick={onClick}>
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
    );
  }

  if (listView) {
    return (
      <div className="space-y-4 border rounded-lg p-6 bg-gradient-to-br from-purple-50/50 to-blue-50/50 dark:from-purple-950/10 dark:to-blue-950/10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg shadow-lg">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h3 className="text-lg font-semibold">AI Market Insights</h3>
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
            
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open && onDialogClose) {
                onDialogClose();
              }
            }}>
              <DialogTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => {
                    setSelectedIndex("");
                    setSelectedAssetType([]);
                    setChatMessage("");
                    setAiResponse(null);
                    setInsightSaved(false);
                    setCurrentQuestion("");
                    setCurrentModel("");
                  }}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Add AI Insights
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-none max-h-[80vh]" style={{ maxWidth: '1200px', width: '90vw' }}>
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Finance AI Insight Generator</DialogTitle>
                  </div>
                  <DialogDescription>
                    Select assets to analyze, then ask the AI assistant for market insights and analysis.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Asset Selection */}
                <div className="mb-6">
                  <div className="space-y-2 relative">
                    <label className="text-sm font-medium">Asset Selection</label>
                    <div className="relative">
                      <Button
                        variant="outline"
                        role="combobox"
                        className="w-full justify-between h-auto min-h-9"
                        onClick={() => setIsAssetPopoverOpen(!isAssetPopoverOpen)}
                      >
                        {selectedAssetType.length === 0 ? (
                          <span className="text-muted-foreground">Select assets</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {selectedAssetType.map((assetId) => (
                              <Badge
                                key={assetId}
                                variant="secondary"
                                className="gap-1"
                              >
                                {getSelectedAssetName(assetId)}
                                <X
                                  className="w-3 h-3 cursor-pointer hover:text-destructive"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleAssetSelection(assetId);
                                  }}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                        <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                      
                      {/* Asset Selection Results */}
                      {isAssetPopoverOpen && (
                        <div className="absolute top-full left-0 z-[100] mt-1 border rounded-lg bg-popover shadow-lg" style={{ minWidth: '400px', width: 'max-content', maxWidth: '600px' }} ref={assetDropdownRef}>
                          <div className="max-h-[400px] overflow-y-auto">
                            {/* Cryptocurrencies Group */}
                            {availableSecurities.filter(s => s.security.type === 'CRYPTO').length > 0 && (
                              <div className="p-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                  <Coins className="w-3 h-3" />
                                  Cryptocurrencies
                                </div>
                                {availableSecurities
                                  .filter(s => s.security.type === 'CRYPTO')
                                  .map((security) => (
                                    <div
                                      key={security.security.id}
                                      className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                      onClick={() => toggleAssetSelection(security.security.id)}
                                    >
                                      <Checkbox
                                        checked={selectedAssetType.includes(security.security.id)}
                                        onCheckedChange={() => toggleAssetSelection(security.security.id)}
                                      />
                                      <Coins className="w-4 h-4 text-yellow-600" />
                                      <span className="flex-1">{security.security.name.value}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                            
                            {/* Stocks Group */}
                            {availableSecurities.filter(s => s.security.type === 'EQUITY').length > 0 && (
                              <div className="p-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                  <Building2 className="w-3 h-3" />
                                  Stocks
                                </div>
                                {availableSecurities
                                  .filter(s => s.security.type === 'EQUITY')
                                  .map((security) => (
                                    <div
                                      key={security.security.id}
                                      className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                      onClick={() => toggleAssetSelection(security.security.id)}
                                    >
                                      <Checkbox
                                        checked={selectedAssetType.includes(security.security.id)}
                                        onCheckedChange={() => toggleAssetSelection(security.security.id)}
                                      />
                                      <Building2 className="w-4 h-4 text-green-600" />
                                      <span className="flex-1">{security.security.name.value}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                            
                            {/* ETFs Group */}
                            {availableSecurities.filter(s => s.security.type === 'ETF').length > 0 && (
                              <div className="p-2">
                                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-2">
                                  <BarChart3 className="w-3 h-3" />
                                  ETFs
                                </div>
                                {availableSecurities
                                  .filter(s => s.security.type === 'ETF')
                                  .map((security) => (
                                    <div
                                      key={security.security.id}
                                      className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                      onClick={() => toggleAssetSelection(security.security.id)}
                                    >
                                      <Checkbox
                                        checked={selectedAssetType.includes(security.security.id)}
                                        onCheckedChange={() => toggleAssetSelection(security.security.id)}
                                      />
                                      <BarChart3 className="w-4 h-4 text-blue-600" />
                                      <span className="flex-1">{security.security.name.value}</span>
                                    </div>
                                  ))}
                              </div>
                            )}
                          </div>
                          {selectedAssetType.length > 0 && (
                            <div className="p-2 border-t">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearAllAssets}
                                className="w-full"
                              >
                                Clear all ({selectedAssetType.length})
                              </Button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Central AI Assistant Area */}
                <div className="flex-1 bg-muted/30 rounded-lg p-8 mb-6 space-y-4">
                  {!aiResponse ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto">
                        <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-lg">Finance AI Assistant</h3>
                      {loadingProvider ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading AI provider...</span>
                        </div>
                      ) : !aiProvider ? (
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No AI provider configured for finance dashboard. 
                          Please configure one in Settings → AI Connections.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Select an index or benchmark above, then ask me to analyze asset performance, 
                            predict market trends, assess portfolio allocation, or provide investment insights.
                          </p>
                          <Badge variant="outline" className="text-xs">
                            Powered by Emergent
                          </Badge>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Brain className="w-5 h-5 text-purple-600" />
                          <h3 className="font-semibold">AI Response</h3>
                          <Badge variant="outline" className="text-xs">
                            {aiProvider?.name}
                          </Badge>
                          {insightSaved && (
                            <Badge variant="default" className="text-xs bg-green-600">
                              Saved
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {!insightSaved && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={handleSaveInsight}
                              disabled={savingInsight}
                            >
                              {savingInsight ? (
                                <>
                                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <Brain className="w-4 h-4 mr-1" />
                                  Save Insight
                                </>
                              )}
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setAiResponse(null);
                              setInsightSaved(false);
                            }}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Clear
                          </Button>
                        </div>
                      </div>
                      <div className="bg-background rounded-lg p-4 max-h-[300px] overflow-y-auto">
                        {(() => {
                          const response = aiResponse || '';
                          // Split by lines and filter for bullet points or numbered items
                          const lines = response.split('\n').filter(line => line.trim());
                          const bulletPoints = lines.filter(line => 
                            line.trim().match(/^[-•*\d.]+\s+/) || 
                            (line.length > 10 && !lines[0]?.includes(line))
                          );
                          
                          if (bulletPoints.length === 0) {
                            // Fallback to original display if no bullet points found
                            return <p className="text-sm whitespace-pre-wrap">{response}</p>;
                          }
                          
                          return (
                            <div className="space-y-3">
                              {bulletPoints.map((point, idx) => {
                                // Remove bullet/number prefix
                                const cleanPoint = point.replace(/^[-•*\d.]+\s+/, '').trim();
                                
                                // Extract percentage (e.g., "65%", "12.5%")
                                const percentMatch = cleanPoint.match(/(\d+(?:\.\d+)?)\s*%/);
                                const percentage = percentMatch ? parseFloat(percentMatch[1]) : null;
                                
                                // Extract ratio (e.g., "3/10", "7/10")
                                const ratioMatch = cleanPoint.match(/(\d+)\s*\/\s*(\d+)/);
                                const ratio = ratioMatch ? (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100 : null;
                                
                                // Extract dollar amounts (e.g., "$145", "$1,234.56")
                                const dollarMatch = cleanPoint.match(/\$[\d,]+(?:\.\d{2})?/);
                                
                                // Determine sentiment/color
                                const hasPositive = /upside|bullish|gain|profit|growth|increase|strong|high confidence/i.test(cleanPoint);
                                const hasNegative = /downside|bearish|loss|risk|decline|decrease|weak|low confidence/i.test(cleanPoint);
                                const hasWarning = /volatil|caution|uncertain|moderate/i.test(cleanPoint);
                                
                                const displayValue = percentage || ratio;
                                
                                return (
                                  <div key={idx} className="flex items-start gap-3 text-sm">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                                      hasPositive ? 'bg-green-500' : 
                                      hasNegative ? 'bg-red-500' : 
                                      hasWarning ? 'bg-yellow-500' : 
                                      'bg-blue-500'
                                    }`} />
                                    <div className="flex-1 space-y-2">
                                      <p className="text-foreground leading-relaxed">{cleanPoint}</p>
                                      {displayValue !== null && (
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                            <div 
                                              className={`h-full transition-all ${
                                                hasPositive ? 'bg-green-500' : 
                                                hasNegative ? 'bg-red-500' : 
                                                hasWarning ? 'bg-yellow-500' : 
                                                'bg-blue-500'
                                              }`}
                                              style={{ width: `${Math.min(displayValue, 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                                            {displayValue.toFixed(0)}%
                                          </span>
                                        </div>
                                      )}
                                      {dollarMatch && !displayValue && (
                                        <Badge variant="outline" className="text-xs">
                                          {dollarMatch[0]}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about market trends, performance analysis, portfolio optimization..."
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !sendingMessage && handleSendMessage()}
                    className="flex-1"
                    disabled={sendingMessage || !aiProvider}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!chatMessage.trim() || sendingMessage || !aiProvider}
                    size="sm"
                    className="gap-2"
                  >
                    {sendingMessage ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Send
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory max-w-[calc(4*350px+3*1rem)]">
          {filteredInsights.map((insight) => {
            // Extract key data points from the insight
            const fullText = insight.details?.fullResponse || insight.shortDescription;
            
            // Extract percentages
            const percentMatches = fullText.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
            const percentages = percentMatches.map(m => parseFloat(m)).slice(0, 3);
            
            // Extract dollar amounts
            const dollarMatches = fullText.match(/\$[\d,]+(?:\.\d{2})?/g) || [];
            
            // Extract ratios
            const ratioMatches = fullText.match(/(\d+)\s*\/\s*(\d+)/g) || [];
            
            // Determine overall sentiment
            const hasPositive = /upside|bullish|gain|profit|growth|increase|strong|high confidence|outperform/i.test(fullText);
            const hasNegative = /downside|bearish|loss|risk|decline|decrease|weak|low confidence|underperform/i.test(fullText);
            const hasWarning = /volatil|caution|uncertain|moderate|mixed/i.test(fullText);
            
            return (
              <Card key={insight.id} className="border-l-4 border-purple-400 min-w-[380px] max-w-[380px] flex-shrink-0 snap-start bg-purple-50 dark:bg-purple-900/10">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700">
                        {insight.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base leading-tight">{insight.title}</CardTitle>
                        <div className="flex items-center gap-1 mt-1.5">
                          <Badge variant="outline" className="text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-xs">
                            Saved Insight
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 -mr-2 flex-shrink-0"
                      onClick={() => handleDeleteInsight(insight.id)}
                    >
                      <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  {/* Key Metrics Display */}
                  {(percentages.length > 0 || dollarMatches.length > 0) && (
                    <div className="grid grid-cols-3 gap-2">
                      {percentages.slice(0, 3).map((pct, idx) => (
                        <div key={idx} className="bg-background rounded-lg p-3 text-center border">
                          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
                            {pct}%
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {idx === 0 ? 'Primary' : idx === 1 ? 'Secondary' : 'Tertiary'}
                          </div>
                        </div>
                      ))}
                      {dollarMatches.slice(0, Math.min(3 - percentages.length, dollarMatches.length)).map((amt, idx) => (
                        <div key={`dollar-${idx}`} className="bg-background rounded-lg p-3 text-center border">
                          <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                            {amt}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Price Target
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* Sentiment Indicator */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Sentiment</span>
                      <span className="font-medium text-purple-700 dark:text-purple-400">
                        {hasPositive ? 'Bullish' : hasNegative ? 'Bearish' : hasWarning ? 'Neutral' : 'Mixed'}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all ${
                          hasPositive ? 'bg-green-500' : 
                          hasNegative ? 'bg-red-500' : 
                          hasWarning ? 'bg-yellow-500' : 
                          'bg-purple-500'
                        }`}
                        style={{ 
                          width: hasPositive ? '75%' : hasNegative ? '25%' : hasWarning ? '50%' : '60%' 
                        }}
                      />
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {insight.shortDescription}
                  </p>
                  
                  <div className="space-y-2">
                    {insight.details?.fullResponse && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 px-0 text-xs hover:bg-transparent">
                            <ChevronRight className="w-3 h-3 mr-1" />
                            Read Full Response
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="mt-2">
                          <div className="bg-muted/30 rounded-lg p-4 space-y-3">
                            {(() => {
                              const response = insight.details.fullResponse;
                              // Split by lines and filter for bullet points or numbered items
                              const lines = response.split('\n').filter(line => line.trim());
                              const bulletPoints = lines.filter(line => 
                                line.trim().match(/^[-•*\d.]+\s+/) || 
                                (line.length > 10 && !lines[0]?.includes(line))
                              );
                              
                              if (bulletPoints.length === 0) {
                                // Fallback to original display if no bullet points found
                                return <div className="text-xs text-muted-foreground whitespace-pre-wrap">{response}</div>;
                              }
                              
                              return bulletPoints.map((point, idx) => {
                                // Remove bullet/number prefix
                                const cleanPoint = point.replace(/^[-•*\d.]+\s+/, '').trim();
                                
                                // Extract percentage (e.g., "65%", "12.5%")
                                const percentMatch = cleanPoint.match(/(\d+(?:\.\d+)?)\s*%/);
                                const percentage = percentMatch ? parseFloat(percentMatch[1]) : null;
                                
                                // Extract ratio (e.g., "3/10", "7/10")
                                const ratioMatch = cleanPoint.match(/(\d+)\s*\/\s*(\d+)/);
                                const ratio = ratioMatch ? (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100 : null;
                                
                                // Extract dollar amounts (e.g., "$145", "$1,234.56")
                                const dollarMatch = cleanPoint.match(/\$[\d,]+(?:\.\d{2})?/);
                                
                                // Determine sentiment/color
                                const hasPositive = /upside|bullish|gain|profit|growth|increase|strong|high confidence/i.test(cleanPoint);
                                const hasNegative = /downside|bearish|loss|risk|decline|decrease|weak|low confidence/i.test(cleanPoint);
                                const hasWarning = /volatil|caution|uncertain|moderate/i.test(cleanPoint);
                                
                                const displayValue = percentage || ratio;
                                
                                return (
                                  <div key={idx} className="flex items-start gap-3 text-sm">
                                    <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                                      hasPositive ? 'bg-green-500' : 
                                      hasNegative ? 'bg-red-500' : 
                                      hasWarning ? 'bg-yellow-500' : 
                                      'bg-blue-500'
                                    }`} />
                                    <div className="flex-1 space-y-2">
                                      <p className="text-foreground leading-relaxed">{cleanPoint}</p>
                                      {displayValue !== null && (
                                        <div className="flex items-center gap-2">
                                          <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                            <div 
                                              className={`h-full transition-all ${
                                                hasPositive ? 'bg-green-500' : 
                                                hasNegative ? 'bg-red-500' : 
                                                hasWarning ? 'bg-yellow-500' : 
                                                'bg-blue-500'
                                              }`}
                                              style={{ width: `${Math.min(displayValue, 100)}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium text-muted-foreground min-w-[3rem] text-right">
                                            {displayValue.toFixed(0)}%
                                          </span>
                                        </div>
                                      )}
                                      {dollarMatch && !displayValue && (
                                        <Badge variant="outline" className="text-xs">
                                          {dollarMatch[0]}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                    <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                      <span>{new Date(insight.details?.createdAt).toLocaleDateString()}</span>
                      <Badge variant="outline" className="text-xs">
                        {insight.details?.provider || 'AI'}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredInsights.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Brain className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              {searchQuery ? (
                <>
                  <h3 className="font-medium mb-2">No Insights Found</h3>
                  <p className="text-sm text-muted-foreground">
                    No insights match "{searchQuery}". Try a different search term.
                  </p>
                </>
              ) : (
                <>
                  <h3 className="font-medium mb-2">No Saved Insights Yet</h3>
                  <p className="text-sm text-muted-foreground">
                    Ask the AI questions about your portfolio and save the insights to see them here
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return null;
}