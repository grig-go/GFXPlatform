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
  AlertTriangle, Eye, Flame, Zap, Send, X, Loader2, Search, Trash2
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface WeatherAIInsightsVisualProps {
  locations: WeatherLocationWithOverrides[];
}

export function WeatherAIInsightsVisual({ locations }: WeatherAIInsightsVisualProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isLocationPopoverOpen, setIsLocationPopoverOpen] = useState(false);
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedInsightType, setSelectedInsightType] = useState<string>("");
  const [chatMessage, setChatMessage] = useState("");
  const [aiProvider, setAiProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [currentModel, setCurrentModel] = useState("");
  const [savingInsight, setSavingInsight] = useState(false);
  const [insightSaved, setInsightSaved] = useState(false);
  const [savedInsights, setSavedInsights] = useState<any[]>([]);
  const [loadingInsights, setLoadingInsights] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

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

  // Load AI provider
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

        if (!response.ok) throw new Error('Failed to load AI providers');

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
    if (!chatMessage.trim() || !aiProvider) {
      if (!aiProvider) {
        toast.error('No AI provider configured for weather dashboard');
      }
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

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
      }

      context += `User Question: ${chatMessage}`;

      const response = await fetch(
        getEdgeFunctionUrl('ai_provider/ai-providers/chat'),
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
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.details || errorMessage;
        } catch (e) {
          errorMessage = await response.text();
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
      toast.error(`AI Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

      if (!response.ok) throw new Error(`Failed to save insight: ${response.status}`);

      const data = await response.json();
      console.log('✅ Insight saved, adding to list:', data.insight);
      console.log('📊 Current insights count:', savedInsights.length);
      
      setSavedInsights(prev => {
        const newInsights = [data.insight, ...prev];
        console.log('📊 New insights count:', newInsights.length);
        return newInsights;
      });
      
      setInsightSaved(true);
      toast.success('Insight saved successfully!');
      
      setTimeout(() => {
        setIsDialogOpen(false);
        // Reset form
        setAiResponse(null);
        setCurrentQuestion("");
        setCurrentModel("");
        setChatMessage("");
        setSelectedLocations([]);
        setSelectedInsightType("");
        setInsightSaved(false);
      }, 1000);
      
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
        getEdgeFunctionUrl('ai_insights/weather/${insightId}'),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) throw new Error(`Failed to delete insight: ${response.status}`);

      setSavedInsights(prev => prev.filter(i => i.id !== insightId));
      toast.success('Insight deleted');
      
    } catch (error) {
      console.error('Error deleting insight:', error);
      toast.error('Failed to delete insight');
    }
  };

  // Helper functions
  const getInsightQuestion = (insight: any) => insight.metadata?.question || insight.topic || insight.question || '';
  const getInsightResponse = (insight: any) => insight.insight || insight.response || '';
  const getInsightType = (insight: any) => insight.metadata?.insightType || insight.category || insight.insightType || 'all';
  const getInsightProvider = (insight: any) => insight.metadata?.provider || insight.provider || 'Unknown';
  const getInsightModel = (insight: any) => insight.metadata?.model || insight.model || '';
  const getInsightCreatedAt = (insight: any) => insight.created_at || insight.createdAt || new Date().toISOString();

  // Filter insights
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) return savedInsights;
    
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

  return (
    <div className="space-y-4 border rounded-lg p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Brain className="w-5 h-5 text-purple-600" />
          <h3 className="font-semibold">AI Weather Insights</h3>
          <Badge variant="secondary">
            {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
          </Badge>
        </div>
        
        <div className="flex items-center gap-2">
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
                              <span className="flex-1">{getSelectedLocationName(location.location.id)}</span>
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

              <div className="space-y-4">
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
                  className="min-h-[100px]"
                  disabled={sendingMessage || loadingProvider}
                />
                
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
          
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[200px]"
            />
          </div>
        </div>
      </div>

      {/* Horizontal Scrolling Insights Cards */}
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
        <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory">
          {filteredInsights.map((insight) => {
            const question = getInsightQuestion(insight);
            const response = getInsightResponse(insight);
            const insightType = getInsightType(insight);
            const provider = getInsightProvider(insight);
            const model = getInsightModel(insight);
            const createdAt = getInsightCreatedAt(insight);
            
            // Get insight type details
            const typeDetails = insightTypes.find(t => t.value === insightType) || insightTypes[0];
            
            // Parse response for visual data
            const lines = response.split('\n').filter(line => line.trim());
            const bulletPoints = lines.filter(line => 
              line.trim().match(/^[-•*\d.]+\s+/) || 
              (line.length > 10 && !lines[0]?.includes(line))
            );
            
            // Extract visual metrics from the response
            const metrics: Array<{text: string; value: number | null; type: 'temp' | 'percent' | 'speed' | 'index' | 'generic'}> = [];
            
            bulletPoints.forEach(point => {
              const cleanPoint = point.replace(/^[-•*\d.]+\s+/, '').trim();
              
              const tempMatch = cleanPoint.match(/(\d+)\s*°\s*[FC]/);
              const percentMatch = cleanPoint.match(/(\d+(?:\.\d+)?)\s*%/);
              const speedMatch = cleanPoint.match(/(\d+)\s*(?:mph|km\/h|kph)/i);
              const indexMatch = cleanPoint.match(/(\d+)\s*\/\s*(\d+)/);
              
              if (tempMatch) {
                metrics.push({ text: cleanPoint, value: parseFloat(tempMatch[1]), type: 'temp' });
              } else if (percentMatch) {
                metrics.push({ text: cleanPoint, value: parseFloat(percentMatch[1]), type: 'percent' });
              } else if (speedMatch) {
                metrics.push({ text: cleanPoint, value: parseFloat(speedMatch[1]), type: 'speed' });
              } else if (indexMatch) {
                const ratio = (parseFloat(indexMatch[1]) / parseFloat(indexMatch[2])) * 100;
                metrics.push({ text: cleanPoint, value: ratio, type: 'index' });
              } else {
                metrics.push({ text: cleanPoint, value: null, type: 'generic' });
              }
            });
            
            // Determine card color based on sentiment
            const hasAlert = /alert|warning|severe|danger|extreme/i.test(response);
            const hasCaution = /caution|moderate|watch|advisory/i.test(response);
            const hasPositive = /clear|sunny|pleasant|favorable|improving/i.test(response);
            
            const borderColor = hasAlert ? 'border-red-400' : 
                               hasCaution ? 'border-yellow-400' : 
                               hasPositive ? 'border-green-400' : 
                               'border-blue-400';
            
            const bgGradient = hasAlert ? 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20' : 
                              hasCaution ? 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20' : 
                              hasPositive ? 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20' : 
                              'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/20 dark:to-cyan-950/20';
            
            return (
              <Card 
                key={insight.id} 
                className={`border-l-4 ${borderColor} ${bgGradient} min-w-[380px] max-w-[380px] flex-shrink-0 snap-start shadow-md hover:shadow-lg transition-shadow`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2 flex-1">
                      <div className="text-2xl">{typeDetails.label.split(' ')[0]}</div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base line-clamp-2">{question}</CardTitle>
                        <div className="flex items-center gap-1 mt-1 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {typeDetails.label}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(createdAt).toLocaleDateString()}
                          </span>
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
                  {/* Visual metrics display */}
                  <div className="space-y-3">
                    {/* Show only first 2 metrics initially for compact view */}
                    {metrics.slice(0, 2).map((metric, idx) => (
                      <div key={idx} className="space-y-2">
                        <div className="flex items-start gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                            hasAlert ? 'bg-red-500' : 
                            hasCaution ? 'bg-yellow-500' : 
                            hasPositive ? 'bg-green-500' : 
                            'bg-blue-500'
                          }`} />
                          <p className="text-sm leading-relaxed flex-1">{metric.text}</p>
                        </div>
                        
                        {/* Visual bar for metrics with values */}
                        {metric.value !== null && (
                          <div className="flex items-center gap-2 ml-3.5">
                            {metric.type === 'temp' ? (
                              <div className="flex items-center gap-2 w-full">
                                <Thermometer className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 bg-gradient-to-r from-blue-200 via-yellow-200 to-red-200 dark:from-blue-800 dark:via-yellow-800 dark:to-red-800 rounded-full h-2 overflow-hidden relative">
                                  <div 
                                    className="absolute top-0 left-0 h-full w-1 bg-foreground"
                                    style={{ left: `${Math.min((metric.value / 120) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium min-w-[3rem] text-right">
                                  {metric.value}°
                                </span>
                              </div>
                            ) : metric.type === 'speed' ? (
                              <div className="flex items-center gap-2 w-full">
                                <Wind className="w-4 h-4 text-muted-foreground shrink-0" />
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      metric.value > 30 ? 'bg-red-500' : 
                                      metric.value > 15 ? 'bg-yellow-500' : 
                                      'bg-green-500'
                                    }`}
                                    style={{ width: `${Math.min((metric.value / 50) * 100, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium min-w-[3rem] text-right">
                                  {metric.value} mph
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 w-full">
                                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                  <div 
                                    className={`h-full transition-all ${
                                      hasAlert ? 'bg-red-500' : 
                                      hasCaution ? 'bg-yellow-500' : 
                                      hasPositive ? 'bg-green-500' : 
                                      'bg-blue-500'
                                    }`}
                                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                                  />
                                </div>
                                <span className="text-xs font-medium min-w-[3rem] text-right">
                                  {metric.value.toFixed(0)}%
                                </span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                    
                    {metrics.length > 2 && (
                      <Collapsible>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 px-0 text-xs w-full justify-start">
                            <ChevronRight className="w-3 h-3 mr-1" />
                            Show {metrics.length - 2} more insights
                          </Button>
                        </CollapsibleTrigger>
                        <CollapsibleContent className="max-h-[400px] overflow-y-auto space-y-3 mt-3 pr-2">
                          {metrics.slice(2).map((metric, idx) => (
                            <div key={idx + 2} className="space-y-2">
                              <div className="flex items-start gap-2">
                                <div className={`w-1.5 h-1.5 rounded-full mt-2 shrink-0 ${
                                  hasAlert ? 'bg-red-500' : 
                                  hasCaution ? 'bg-yellow-500' : 
                                  hasPositive ? 'bg-green-500' : 
                                  'bg-blue-500'
                                }`} />
                                <p className="text-sm leading-relaxed flex-1">{metric.text}</p>
                              </div>
                              
                              {metric.value !== null && (
                                <div className="flex items-center gap-2 ml-3.5">
                                  {metric.type === 'temp' ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <Thermometer className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <div className="flex-1 bg-gradient-to-r from-blue-200 via-yellow-200 to-red-200 dark:from-blue-800 dark:via-yellow-800 dark:to-red-800 rounded-full h-2 overflow-hidden relative">
                                        <div 
                                          className="absolute top-0 left-0 h-full w-1 bg-foreground"
                                          style={{ left: `${Math.min((metric.value / 120) * 100, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium min-w-[3rem] text-right">
                                        {metric.value}°
                                      </span>
                                    </div>
                                  ) : metric.type === 'speed' ? (
                                    <div className="flex items-center gap-2 w-full">
                                      <Wind className="w-4 h-4 text-muted-foreground shrink-0" />
                                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${
                                            metric.value > 30 ? 'bg-red-500' : 
                                            metric.value > 15 ? 'bg-yellow-500' : 
                                            'bg-green-500'
                                          }`}
                                          style={{ width: `${Math.min((metric.value / 50) * 100, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium min-w-[3rem] text-right">
                                        {metric.value} mph
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 w-full">
                                      <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                                        <div 
                                          className={`h-full transition-all ${
                                            hasAlert ? 'bg-red-500' : 
                                            hasCaution ? 'bg-yellow-500' : 
                                            hasPositive ? 'bg-green-500' : 
                                            'bg-blue-500'
                                          }`}
                                          style={{ width: `${Math.min(metric.value, 100)}%` }}
                                        />
                                      </div>
                                      <span className="text-xs font-medium min-w-[3rem] text-right">
                                        {metric.value.toFixed(0)}%
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                  
                  {/* Footer with provider info */}
                  <div className="flex items-center justify-between pt-3 border-t text-xs text-muted-foreground">
                    <span>{provider}</span>
                    {model && <span>{model}</span>}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}