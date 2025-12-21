import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { Textarea } from "./ui/textarea";
import { WeatherLocationWithOverrides, getFieldValue } from "../types/weather";
import { 
  Brain, ChevronDown, ChevronRight, Cloud, Thermometer, Wind, Droplets,
  AlertTriangle, Eye, Flame, Zap, Send, X, Loader2, Search, Trash2, ChevronLeft
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";

interface WeatherAIInsightsProps {
  locations: WeatherLocationWithOverrides[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultLocationId?: string;
}

export function WeatherAIInsights({ 
  locations, 
  compact = false, 
  listView = false, 
  onClick,
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
  defaultLocationId
}: WeatherAIInsightsProps) {
  const [internalDialogOpen, setInternalDialogOpen] = useState(false);
  
  // Use controlled state if provided, otherwise use internal state
  const isDialogOpen = controlledOpen !== undefined ? controlledOpen : internalDialogOpen;
  const setIsDialogOpen = controlledOnOpenChange || setInternalDialogOpen;
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedInsightType, setSelectedInsightType] = useState<string>("");
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
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Weather insight types
  const insightTypes = [
    { value: 'all', label: '🌤️ All Insights', description: 'General weather analysis' },
    { value: 'alerts', label: '⚠️ Active Alerts', description: 'Weather warnings and advisories' },
    { value: 'precipitation', label: '🌧️ Precipitation', description: 'Rain and snow patterns' },
    { value: 'temperature', label: '🌡️ Temperature', description: 'Heat and cold analysis' },
    { value: 'wind', label: '💨 Wind', description: 'Wind speed and gusts' },
    { value: 'airquality', label: '😷 Air Quality', description: 'AQI and pollution levels' },
    { value: 'lightning', label: '⚡ Lightning', description: 'Storm activity' },
    { value: 'visibility', label: '🌫️ Visibility', description: 'Fog and visibility conditions' },
    { value: 'tropical', label: '🌪️ Tropical', description: 'Hurricane and tropical systems' },
  ];

  // Load AI provider assigned to weather dashboard
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
        
        // Find provider assigned to weather dashboard
        const weatherProvider = data.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'weather' && d.textProvider
          )
        );

        if (weatherProvider) {
          setAiProvider(weatherProvider);
          console.log('Weather AI Provider loaded:', weatherProvider.name);
        } else {
          console.warn('No AI provider assigned to weather dashboard');
        }
      } catch (error) {
        console.error('Error loading AI provider:', error);
      } finally {
        setLoadingProvider(false);
      }
    };

    loadAIProvider();
  }, []);

  // Pre-select location when dialog opens with defaultLocationId
  useEffect(() => {
    if (isDialogOpen && defaultLocationId && !selectedLocations.includes(defaultLocationId)) {
      setSelectedLocations([defaultLocationId]);
    }
  }, [isDialogOpen, defaultLocationId]);

  // Load saved insights
  useEffect(() => {
    const loadSavedInsights = async () => {
      try {
        setLoadingInsights(true);
        
        const response = await fetch(
          getEdgeFunctionUrl('ai_insights/weather'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (!response.ok) throw new Error(`Failed to load insights: ${response.status}`);

        const data = await response.json();
        setSavedInsights(data.insights || []);
      } catch (error) {
        console.error('Error loading saved insights:', error);
        // Only show toast if it's not a network error (likely function not deployed yet)
        if (error instanceof Error && !error.message.includes('Failed to fetch')) {
          toast.error('Failed to load saved insights');
        }
        setSavedInsights([]);
      } finally {
        setLoadingInsights(false);
      }
    };

    loadSavedInsights();
  }, []);

  const toggleLocationSelection = (locationId: string) => {
    setSelectedLocations(prev => 
      prev.includes(locationId)
        ? prev.filter(id => id !== locationId)
        : [...prev, locationId]
    );
  };

  const clearAllLocations = () => {
    setSelectedLocations([]);
  };

  const getSelectedLocationName = (locationId: string) => {
    const location = locations.find(l => l.location.id === locationId);
    return location ? getFieldValue(location.location.name) : locationId;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for weather dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected locations and insight type
      let context = 'You are a helpful weather AI assistant analyzing meteorological data. Please provide 3-10 insightful bullet points with short sentences containing specific percentages, probabilities, and quantifiable metrics that can be easily visualized. Format for easy visualization (e.g., "65% precipitation probability", "Risk level: 7/10", "Temperature: 72°F", "Wind: 15 mph"). Focus on actionable, data-rich insights with concrete numbers.\n\n';
      
      const selectedInsight = insightTypes.find(type => type.value === selectedInsightType);
      
      if (selectedInsight && selectedInsight.value !== 'all') {
        context += `Focus Area: ${selectedInsight.label} - ${selectedInsight.description}\n\n`;
      }

      if (selectedLocations.length > 0) {
        context += `Selected Locations:\n`;
        selectedLocations.forEach(locationId => {
          const location = locations.find(l => l.location.id === locationId);
          if (location) {
            const current = location.data?.current;
            if (current) {
              const temp = typeof current.temperature?.value === 'object' 
                ? (current.temperature.value as any).value 
                : current.temperature?.value;
              const tempUnit = typeof current.temperature?.unit === 'object'
                ? (current.temperature.unit as any).value
                : current.temperature?.unit;
              const humidity = typeof current.humidity === 'object'
                ? (current.humidity as any).value
                : current.humidity;
              const windSpeed = typeof current.wind?.speed?.value === 'object'
                ? (current.wind.speed.value as any).value
                : current.wind?.speed?.value;
              const windUnit = typeof current.wind?.speed?.unit === 'object'
                ? (current.wind.speed.unit as any).value
                : current.wind?.speed?.unit;
              const summary = typeof current.summary === 'object'
                ? (current.summary as any).value
                : current.summary;
              
              context += `- ${getFieldValue(location.location.name)}: ${temp}°${tempUnit}, ${summary}, Humidity: ${humidity}%, Wind: ${windSpeed} ${windUnit}\n`;
              if (location.data?.alerts?.length > 0) {
                context += `  Alerts: ${location.data.alerts.map(a => a.event).join(', ')}\n`;
              }
            }
          }
        });
        context += '\n';
      } else {
        context += 'Analyzing all monitored locations.\n\n';
      }

      context += `User Question: ${chatMessage}`;

      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/chat'),
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
            dashboard: 'weather',
          }),
        }
      );

      if (!response.ok) {
        let errorMessage = 'Failed to get AI response';
        let isQuotaError = false;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
          isQuotaError = response.status === 429 || errorData.isQuotaError;
          
          if (isQuotaError) {
            toast.error(
              <div className="space-y-2">
                <p className="font-medium">API Quota Exceeded</p>
                <p className="text-sm whitespace-pre-line">{errorMessage}</p>
              </div>,
              { duration: 10000 }
            );
          }
        } catch (e) {
          const errorText = await response.text();
          errorMessage = `HTTP ${response.status}: ${errorText}`;
        }
        throw new Error(errorMessage);
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
        getEdgeFunctionUrl('ai_insights/weather'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedLocations: selectedLocations,
            insightType: selectedInsightType || 'all',
            provider: aiProvider?.name || 'Unknown',
            model: currentModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to save insight: ${response.status}`);
      }

      const data = await response.json();
      setSavedInsights(prev => [data.insight, ...prev]);
      setInsightSaved(true);
      toast.success('Insight saved successfully!');
      
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
        getEdgeFunctionUrl(`ai_insights/weather/${insightId}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to delete insight: ${response.status}`);
      }

      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
      
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

  // Helper functions to handle both old KV structure and new table structure
  const getInsightQuestion = (insight: any) => {
    return insight.metadata?.question || insight.topic || insight.question || '';
  };

  const getInsightResponse = (insight: any) => {
    return insight.insight || insight.response || '';
  };

  const getInsightType = (insight: any) => {
    return insight.metadata?.insightType || insight.category || insight.insightType || 'all';
  };

  const getInsightProvider = (insight: any) => {
    return insight.metadata?.provider || insight.provider || 'Unknown';
  };

  const getInsightModel = (insight: any) => {
    return insight.metadata?.model || insight.model || '';
  };

  const getInsightCreatedAt = (insight: any) => {
    return insight.created_at || insight.createdAt || new Date().toISOString();
  };

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) {
      return savedInsights;
    }
    
    const query = searchQuery.toLowerCase();
    return savedInsights.filter(insight => {
      const question = getInsightQuestion(insight);
      const response = getInsightResponse(insight);
      const insightType = getInsightType(insight);
      
      return (
        question.toLowerCase().includes(query) ||
        response.toLowerCase().includes(query) ||
        insightType.toLowerCase().includes(query)
      );
    });
  }, [savedInsights, searchQuery]);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2, type: "spring", stiffness: 100 }}
        whileHover={{ y: -4, transition: { duration: 0.2 } }}
      >
      <Card className="h-full relative overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group" onClick={onClick}>
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
          initial={false}
        />
        <CardContent className="p-6 relative">
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
                  <motion.div 
                    className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 400 }}
                  >
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Insights</p>
                    <motion.p 
                      className="text-2xl font-semibold"
                      key={savedInsights.length}
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 0.3 }}
                    >
                      {savedInsights.length}
                    </motion.p>
                  </div>
                </>
              )}
            </div>
            <p className="text-xs text-muted-foreground">Saved analyses</p>
          </div>
        </CardContent>
      </Card>
      </motion.div>
    );
  }

  if (listView) {
    return (
      <div className="space-y-4 border rounded-lg p-6">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">AI Weather Insights</h3>
          <Badge variant="secondary">
            {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
          </Badge>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedLocations([]);
                    setSelectedInsightType("");
                    setChatMessage("");
                    setAiResponse(null);
                    setInsightSaved(false);
                    setCurrentQuestion("");
                    setCurrentModel("");
                  }}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Add AI Insights
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Weather AI Insight Generator</DialogTitle>
                  </div>
                  <DialogDescription>
                    Select locations and an insight type, then ask the AI assistant for weather analysis and predictions.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Two dropdowns side by side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Locations</label>
                    <Popover open={isLocationPopoverOpen} onOpenChange={setIsLocationPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto min-h-9"
                        >
                          {selectedLocations.length === 0 ? (
                            <span className="text-muted-foreground">Select locations</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {selectedLocations.map((locationId) => (
                                <Badge
                                  key={locationId}
                                  variant="secondary"
                                  className="gap-1"
                                >
                                  {getSelectedLocationName(locationId)}
                                  <X
                                    className="w-3 h-3 cursor-pointer hover:text-destructive"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleLocationSelection(locationId);
                                    }}
                                  />
                                </Badge>
                              ))}
                            </div>
                          )}
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-[400px] p-0" align="start">
                        <ScrollArea className="h-[300px]">
                          <div className="p-2">
                            {locations.map((location) => (
                              <div
                                key={location.location.id}
                                className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                onClick={() => toggleLocationSelection(location.location.id)}
                              >
                                <Checkbox
                                  checked={selectedLocations.includes(location.location.id)}
                                  onCheckedChange={() => toggleLocationSelection(location.location.id)}
                                />
                                <Cloud className="w-4 h-4 text-blue-600" />
                                <span className="flex-1">{getFieldValue(location.location.name)}</span>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                        {selectedLocations.length > 0 && (
                          <div className="p-2 border-t">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={clearAllLocations}
                              className="w-full"
                            >
                              Clear all ({selectedLocations.length})
                            </Button>
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Insight Type</label>
                    <div className="relative">
                      <Select value={selectedInsightType} onValueChange={setSelectedInsightType}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select insight type" />
                        </SelectTrigger>
                        <SelectContent>
                          {insightTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex flex-col">
                                <span>{type.label}</span>
                                <span className="text-xs text-muted-foreground">{type.description}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* Chat Input */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <Textarea
                      placeholder="Ask about weather patterns, forecasts, alerts, or any weather-related question..."
                      value={chatMessage}
                      onChange={(e) => setChatMessage(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage();
                        }
                      }}
                      className="flex-1 min-h-[100px]"
                      disabled={sendingMessage || loadingProvider}
                    />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      {loadingProvider ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Loading AI provider...
                        </span>
                      ) : aiProvider ? (
                        <span>Using {aiProvider.name}</span>
                      ) : (
                        <span className="text-orange-600">No AI provider assigned to Weather</span>
                      )}
                    </div>
                    <Button 
                      onClick={handleSendMessage} 
                      disabled={!chatMessage.trim() || sendingMessage || loadingProvider || !aiProvider}
                    >
                      {sendingMessage ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Ask AI
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {/* AI Response */}
                {aiResponse && (
                  <div className="space-y-3 border-t pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="w-5 h-5 text-purple-600" />
                        <span className="font-medium">AI Response</span>
                        {currentModel && (
                          <Badge variant="outline" className="text-xs">
                            {currentModel}
                          </Badge>
                        )}
                      </div>
                      <Button
                        onClick={handleSaveInsight}
                        disabled={savingInsight || insightSaved}
                        size="sm"
                        variant={insightSaved ? "outline" : "default"}
                      >
                        {savingInsight ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : insightSaved ? (
                          <>✓ Saved</>
                        ) : (
                          <>Save Insight</>
                        )}
                      </Button>
                    </div>
                    <ScrollArea className="h-[300px] p-4 bg-muted rounded-lg">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <p className="whitespace-pre-wrap">{aiResponse}</p>
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </DialogContent>
            </Dialog>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search insights..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Saved Insights List */}
        {loadingInsights ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredInsights.length === 0 ? (
          <div className="text-center py-12">
            <Brain className="w-12 h-12 mx-auto mb-3 text-muted-foreground" />
            <p className="text-muted-foreground">
              {searchQuery ? 'No insights match your search' : 'No saved insights yet'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredInsights.map((insight) => {
              const isExpanded = expandedInsights.has(insight.id);
              const question = getInsightQuestion(insight);
              const response = getInsightResponse(insight);
              const insightType = getInsightType(insight);
              const provider = getInsightProvider(insight);
              const model = getInsightModel(insight);
              const createdAt = getInsightCreatedAt(insight);
              
              // Extract key data points from the insight
              const fullText = response || question;
              
              // Extract percentages
              const percentMatches = fullText.match(/(\d+(?:\.\d+)?)\s*%/g) || [];
              const percentages = percentMatches.map(m => parseFloat(m)).slice(0, 3);
              
              // Extract temperatures
              const tempMatches = fullText.match(/(\d+)\s*°[CF]/g) || [];
              
              // Extract wind speeds
              const windMatches = fullText.match(/(\d+)\s*mph/gi) || [];
              
              // Determine overall sentiment/severity
              const hasWarning = /warning|alert|severe|dangerous|extreme|caution/i.test(fullText);
              const hasWatch = /watch|monitor|possible|potential/i.test(fullText);
              const hasNormal = /normal|typical|average|moderate/i.test(fullText);
              
              return (
                <Card key={insight.id} className="border-l-4 border-purple-400 bg-purple-50 dark:bg-purple-900/10">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-1">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20 border border-purple-300 dark:border-purple-700">
                          <Brain className="w-4 h-4 text-purple-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base leading-tight">{question}</CardTitle>
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            <Badge variant="outline" className="text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 border-purple-200 text-xs">
                              {insightTypes.find(t => t.value === insightType)?.label || insightType}
                            </Badge>
                            {provider && (
                              <Badge variant="outline" className="text-xs">
                                {provider}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => toggleInsightExpansion(insight.id)}
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3 h-3" />
                          ) : (
                            <ChevronRight className="w-3 h-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleDeleteInsight(insight.id)}
                        >
                          <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0 space-y-4">
                    {/* Key Metrics Display */}
                    {(percentages.length > 0 || tempMatches.length > 0 || windMatches.length > 0) && (
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
                        {tempMatches.slice(0, Math.min(3 - percentages.length, tempMatches.length)).map((temp, idx) => (
                          <div key={`temp-${idx}`} className="bg-background rounded-lg p-3 text-center border">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                              {temp}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Temperature
                            </div>
                          </div>
                        ))}
                        {windMatches.slice(0, Math.min(3 - percentages.length - tempMatches.length, windMatches.length)).map((wind, idx) => (
                          <div key={`wind-${idx}`} className="bg-background rounded-lg p-3 text-center border">
                            <div className="text-lg font-bold text-purple-700 dark:text-purple-400">
                              {wind}
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              Wind Speed
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Severity Indicator */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Severity</span>
                        <span className="font-medium text-purple-700 dark:text-purple-400">
                          {hasWarning ? 'High Alert' : hasWatch ? 'Watch' : hasNormal ? 'Normal' : 'Monitored'}
                        </span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            hasWarning ? 'bg-red-500' : 
                            hasWatch ? 'bg-yellow-500' : 
                            hasNormal ? 'bg-green-500' : 
                            'bg-purple-500'
                          }`}
                          style={{ 
                            width: hasWarning ? '90%' : hasWatch ? '65%' : hasNormal ? '30%' : '50%' 
                          }}
                        />
                      </div>
                    </div>
                    
                    {isExpanded && (
                      <div className="space-y-2">
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{response}</p>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                          <span>{new Date(createdAt).toLocaleDateString()}</span>
                          {model && (
                            <Badge variant="outline" className="text-xs">
                              {model}
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Default full view - dialog only mode (opened from cards)
  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader className="space-y-0 pb-4">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <DialogTitle>Weather AI Insight Generator</DialogTitle>
          </div>
          <DialogDescription>
            Select locations and an insight type, then ask the AI assistant for weather analysis and predictions.
          </DialogDescription>
        </DialogHeader>
        
        {/* Two dropdowns side by side */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Locations</label>
            <Popover open={isLocationPopoverOpen} onOpenChange={setIsLocationPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full justify-between h-auto min-h-9"
                >
                  {selectedLocations.length === 0 ? (
                    <span className="text-muted-foreground">Select locations</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {selectedLocations.map((locationId) => (
                        <Badge
                          key={locationId}
                          variant="secondary"
                          className="gap-1"
                        >
                          {getSelectedLocationName(locationId)}
                          <X
                            className="w-3 h-3 cursor-pointer hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleLocationSelection(locationId);
                            }}
                          />
                        </Badge>
                      ))}
                    </div>
                  )}
                  <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    {locations.map((location) => (
                      <div
                        key={location.location.id}
                        className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                        onClick={() => toggleLocationSelection(location.location.id)}
                      >
                        <Checkbox
                          checked={selectedLocations.includes(location.location.id)}
                          onCheckedChange={() => toggleLocationSelection(location.location.id)}
                        />
                        <Cloud className="w-4 h-4 text-blue-600" />
                        <span className="flex-1">{getFieldValue(location.location.name)}</span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
                {selectedLocations.length > 0 && (
                  <div className="p-2 border-t">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllLocations}
                      className="w-full"
                    >
                      Clear all ({selectedLocations.length})
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Insight Type</label>
            <div className="relative">
              <Select value={selectedInsightType} onValueChange={setSelectedInsightType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select insight type" />
                </SelectTrigger>
                <SelectContent>
                  {insightTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      <div className="flex flex-col">
                        <span>{type.label}</span>
                        <span className="text-xs text-muted-foreground">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Chat Input */}
        <div className="space-y-4">
          <div className="flex gap-2">
            <Textarea
              placeholder="Ask about weather patterns, forecasts, alerts, or any weather-related question..."
              value={chatMessage}
              onChange={(e) => setChatMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="min-h-[80px] flex-1"
              disabled={!aiProvider || sendingMessage}
            />
            <Button 
              onClick={handleSendMessage}
              disabled={!chatMessage.trim() || !aiProvider || sendingMessage}
              className="self-end"
            >
              {sendingMessage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>

          {!aiProvider && !loadingProvider && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800">
                ⚠️ No AI provider configured for Weather Dashboard. Configure an AI provider to use insights.
              </p>
            </div>
          )}

          {aiResponse && (
            <div className="space-y-3 p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="w-4 h-4 text-purple-600" />
                  <span className="text-sm font-medium">AI Response</span>
                  {insightSaved && (
                    <Badge variant="outline" className="text-xs bg-green-50 border-green-200 text-green-800">
                      ✓ Saved
                    </Badge>
                  )}
                </div>
                {!insightSaved && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveInsight}
                    disabled={savingInsight}
                  >
                    {savingInsight ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Insight'
                    )}
                  </Button>
                )}
              </div>
              <p className="text-sm whitespace-pre-wrap">{aiResponse}</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}