import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Checkbox } from "./ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { ScrollArea } from "./ui/scroll-area";
import { SportsEntityWithOverrides, SportsData } from "../types/sports";
import { 
  Brain, ChevronDown, ChevronRight, Trophy, Users,
  Send, X, Loader2, Search, Target, TrendingUp, TrendingDown,
  AlertTriangle, Award, Activity, BarChart3, Shield, Zap
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";

interface SportsAIInsightsProps {
  entities: SportsEntityWithOverrides[];
  data?: SportsData;
  providers?: any[];
  compact?: boolean;
  listView?: boolean;
  onClick?: () => void;
}

export function SportsAIInsights({ entities, data, providers = [], compact = false, listView = false, onClick }: SportsAIInsightsProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isTeamPopoverOpen, setIsTeamPopoverOpen] = useState(false);
  const [selectedLeague, setSelectedLeague] = useState<string>("");
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);
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
  const [teamsData, setTeamsData] = useState<any[]>([]);

  // Load teams from backend
  useEffect(() => {
    const loadTeams = async () => {
      // COMMENTED OUT - not using sports_dashboard edge function right now
      // try {
      //   const response = await fetch(
      //     getEdgeFunctionUrl('sports_dashboard/sports-data/teams'),
      //     {
      //       headers: {
      //         Authorization: `Bearer ${getSupabaseAnonKey()}`,
      //       },
      //     }
      //   );

      //   if (!response.ok) {
      //     throw new Error('Failed to load teams');
      //   }

      //   const responseData = await response.json();
      //   setTeamsData(responseData.teams || []);
      //   console.log(`Loaded ${responseData.teams?.length || 0} teams from KV store`);
      //   if (responseData.teams?.length > 0) {
      //     console.log('Sample team structure:', responseData.teams[0]);
      //   }
      // } catch (error) {
      //   console.error('Error loading teams from KV store:', error);
      // }
      
      // Return empty data for now
      setTeamsData([]);
    };

    loadTeams();
  }, []);

  // Load AI provider assigned to sports dashboard
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

        const responseData = await response.json();
        
        // Find provider assigned to sports dashboard
        const sportsProvider = responseData.providers?.find((p: any) =>
          p.dashboardAssignments?.some((d: any) => 
            d.dashboard === 'sports' && d.textProvider
          )
        );

        if (sportsProvider) {
          setAiProvider(sportsProvider);
          console.log('Sports AI Provider loaded:', sportsProvider.name);
        } else {
          console.warn('No AI provider assigned to sports dashboard');
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
      // COMMENTED OUT - not using sports_dashboard edge function right now
      // try {
      //   setLoadingInsights(true);
      //   const response = await fetch(
      //     getEdgeFunctionUrl('sports_dashboard/sports-ai-insights'),
      //     {
      //       headers: {
      //         Authorization: `Bearer ${getSupabaseAnonKey()}`,
      //       },
      //     }
      //   );

      //   if (!response.ok) {
      //     throw new Error('Failed to load saved insights');
      //   }

      //   const responseData = await response.json();
      //   setSavedInsights(responseData.insights || []);
      //   console.log(`Loaded ${responseData.insights?.length || 0} saved sports AI insights`);
      // } catch (error) {
      //   console.error('Error loading saved insights:', error);
      //   toast.error('Failed to load saved insights');
      // } finally {
      //   setLoadingInsights(false);
      // }
      
      // Return empty data for now
      setSavedInsights([]);
      setLoadingInsights(false);
    };

    loadSavedInsights();
  }, []);

  // Get available leagues and tournaments (only from active providers)
  const availableLeagues = useMemo(() => {
    // Use a Map to deduplicate by ID (key = id, value = option object)
    const optionsMap = new Map<string, { id: string; name: string; type: 'league' | 'tournament' }>();
    
    // Filter to only show leagues from active providers
    const activeProviders = providers.filter((p: any) => p.isActive);
    
    if (data?.leagues) {
      data.leagues.forEach(league => {
        // Check if league belongs to an active provider
        // Convert ID to string in case it's a number from database
        const leagueId = String(league.id);
        const leagueProviderId = leagueId.startsWith('sr:') ? 'sportsradar' : 
                                 leagueId.startsWith('sm_') ? 'sportmonks' : null;
        
        // Find matching active provider
        const hasActiveProvider = activeProviders.some((p: any) => 
          p.id.includes(leagueProviderId || '') || 
          (leagueProviderId === 'sportsradar' && p.id.includes('sportsradar')) ||
          (leagueProviderId === 'sportmonks' && p.id.includes('sportmonks'))
        );
        
        if (hasActiveProvider && !optionsMap.has(leagueId)) {
          optionsMap.set(leagueId, {
            id: leagueId,
            name: `${league.name} (${league.abbrev})`,
            type: 'league'
          });
        }
      });
    }
    
    if (data?.tournaments) {
      data.tournaments.forEach(tournament => {
        const tournamentEntity = tournament.entity as any;
        if (tournamentEntity.name) {
          // Check if tournament belongs to an active provider
          const tournamentProviderId = tournament.entity.id.startsWith('sr:') ? 'sportsradar' : 
                                       tournament.entity.id.startsWith('sm_') ? 'sportmonks' : null;
          
          const hasActiveProvider = activeProviders.some((p: any) => 
            p.id.includes(tournamentProviderId || '') ||
            (tournamentProviderId === 'sportsradar' && p.id.includes('sportsradar')) ||
            (tournamentProviderId === 'sportmonks' && p.id.includes('sportmonks'))
          );
          
          // Only add if not already in map (prefer league name over tournament name)
          if (hasActiveProvider && !optionsMap.has(tournament.entity.id)) {
            optionsMap.set(tournament.entity.id, {
              id: tournament.entity.id,
              name: tournamentEntity.name,
              type: 'tournament'
            });
          }
        }
      });
    }
    
    // Convert Map values to array and sort
    return Array.from(optionsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [data, providers]);

  // Get available teams (deduplicated by ID)
  const availableTeams = useMemo(() => {
    const teams = entities.filter(entity => 'abbrev' in entity.entity && 'city' in entity.entity);
    
    // Use Map to deduplicate by team ID
    const teamsMap = new Map<string, { id: string; name: string }>();
    
    teams.forEach(team => {
      const teamEntity = team.entity as any;
      if (!teamsMap.has(team.entity.id)) {
        teamsMap.set(team.entity.id, {
          id: team.entity.id,
          name: teamEntity.name || teamEntity.abbrev || 'Unknown Team'
        });
      }
    });
    
    return Array.from(teamsMap.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [entities]);

  const toggleTeamSelection = (teamId: string) => {
    setSelectedTeams(prev => 
      prev.includes(teamId)
        ? prev.filter(id => id !== teamId)
        : [...prev, teamId]
    );
  };

  const clearAllTeams = () => {
    setSelectedTeams([]);
  };

  const getSelectedTeamName = (teamId: string) => {
    const team = availableTeams.find(t => t.id === teamId);
    return team ? team.name : teamId;
  };

  const handleSendMessage = async () => {
    if (!chatMessage.trim()) return;
    
    if (!aiProvider) {
      toast.error('No AI provider configured for sports dashboard. Please configure one in AI Connections.');
      return;
    }

    try {
      setSendingMessage(true);
      setAiResponse(null);

      // Build context from selected league and teams
      let context = 'You are a helpful sports AI assistant analyzing sports data. Please provide 3-10 insightful bullet points with short sentences containing specific percentages, probabilities, ratios, and quantifiable metrics that can be easily visualized. Format for easy visualization (e.g., "65% win probability", "Goal differential: +15", "82% confidence", "Form: W-W-L-W-W"). Focus on actionable, data-rich insights with concrete numbers.\n\n';
      
      if (selectedLeague) {
        const leagueData = availableLeagues.find(l => l.id === selectedLeague);
        if (leagueData) {
          context += `Selected ${leagueData.type === 'league' ? 'League' : 'Tournament'}: ${leagueData.name}\n\n`;
        }
      }

      if (selectedTeams.length > 0) {
        context += `Selected Teams:\n`;
        selectedTeams.forEach(teamId => {
          const team = availableTeams.find(t => t.id === teamId);
          if (team) {
            context += `- ${team.name}\n`;
          }
        });
        context += '\n';
      } else {
        context += `Analyzing all teams\n\n`;
      }

      context += `User Question: ${chatMessage}`;

      console.log('Sending AI request with context:', context);

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
            dashboard: 'sports',
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

      const responseData = await response.json();
      setAiResponse(responseData.response);
      setCurrentQuestion(chatMessage);
      setCurrentModel(responseData.model || aiProvider.model);
      setInsightSaved(false);
      toast.success(`Response from ${responseData.provider}`);
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
        getEdgeFunctionUrl('sports_dashboard/sports-ai-insights'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            question: currentQuestion,
            response: aiResponse,
            selectedLeague: selectedLeague || null,
            selectedTeams: selectedTeams,
            provider: aiProvider?.name || 'Unknown',
            model: currentModel,
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save insight');
      }

      const responseData = await response.json();
      setSavedInsights(prev => [responseData.insight, ...prev]);
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
        getEdgeFunctionUrl('sports_dashboard/sports-ai-insights/${insightId}'),
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

  // Helper to get team info for an insight
  const getTeamInfo = (insight: any) => {
    if (!insight.selectedTeams || insight.selectedTeams.length === 0) {
      return null;
    }

    const teamId = insight.selectedTeams[0]; // Use first team
    
    // Find team in fetched teams data
    const teamFromBackend = teamsData.find(t => t.id === teamId);
    if (teamFromBackend) {
      console.log('Found team in backend:', teamFromBackend);
      return {
        name: teamFromBackend.name || teamFromBackend.abbrev || 'Unknown Team',
        logo: teamFromBackend.brand?.logos?.[0]?.url || null,
        primaryColor: teamFromBackend.brand?.primary_color || null,
        secondaryColor: teamFromBackend.brand?.secondary_color || null
      };
    }

    // Fallback to availableTeams
    const team = availableTeams.find(t => t.id === teamId);
    if (!team) return null;

    return { name: team.name };
  };

  // Helper to determine icon for a bullet point
  const getTopicIcon = (text: string) => {
    const lowerText = text.toLowerCase();
    
    if (lowerText.includes('win') || lowerText.includes('victory') || lowerText.includes('success')) {
      return { Icon: Award, color: 'text-green-600' };
    }
    if (lowerText.includes('loss') || lowerText.includes('defeat') || lowerText.includes('fail')) {
      return { Icon: TrendingDown, color: 'text-red-600' };
    }
    if (lowerText.includes('risk') || lowerText.includes('warning') || lowerText.includes('caution')) {
      return { Icon: AlertTriangle, color: 'text-yellow-600' };
    }
    if (lowerText.includes('performance') || lowerText.includes('stats') || lowerText.includes('average')) {
      return { Icon: BarChart3, color: 'text-blue-600' };
    }
    if (lowerText.includes('defense') || lowerText.includes('defensive')) {
      return { Icon: Shield, color: 'text-indigo-600' };
    }
    if (lowerText.includes('attack') || lowerText.includes('offense') || lowerText.includes('goal')) {
      return { Icon: Zap, color: 'text-orange-600' };
    }
    if (lowerText.includes('trend') || lowerText.includes('improvement') || lowerText.includes('growing')) {
      return { Icon: TrendingUp, color: 'text-emerald-600' };
    }
    if (lowerText.includes('form') || lowerText.includes('recent') || lowerText.includes('streak')) {
      return { Icon: Activity, color: 'text-purple-600' };
    }
    
    // Default
    return { Icon: Target, color: 'text-gray-600' };
  };

  // Filter insights based on search query
  const filteredInsights = useMemo(() => {
    if (!searchQuery.trim()) return savedInsights;
    
    const query = searchQuery.toLowerCase();
    return savedInsights.filter((insight: any) => {
      const searchableText = `${insight.question} ${insight.response}`.toLowerCase();
      return searchableText.includes(query);
    });
  }, [savedInsights, searchQuery]);

  if (compact) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.5,
          delay: 0.3,
          type: "spring",
          stiffness: 100,
          damping: 15
        }}
      >
      <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group cursor-pointer" onClick={onClick}>
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
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                  >
                    <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">AI Insights</p>
                    <motion.p 
                      className="text-2xl font-semibold"
                      key={savedInsights.length}
                      initial={{ scale: 1.2, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 200, damping: 15 }}
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
      <div className="border rounded-lg overflow-hidden flex flex-col max-h-[70vh]">
        <div className="p-6 border-b shrink-0">
          <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            <h3 className="font-semibold">AI Sports Insights</h3>
            <Badge variant="secondary">
              {searchQuery ? `${filteredInsights.length} of ${savedInsights.length}` : `${savedInsights.length} Saved`}
            </Badge>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSelectedLeague("");
                    setSelectedTeams([]);
                    setChatMessage("");
                    setAiResponse(null);
                    setInsightSaved(false);
                    setCurrentQuestion("");
                    setCurrentModel("");
                  }}
                >
                  <Brain className="w-4 h-4 mr-2" />
                  Add AI Insight
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl max-h-[80vh]">
                <DialogHeader className="space-y-0 pb-4">
                  <div className="flex items-center gap-2">
                    <Brain className="w-5 h-5 text-purple-600" />
                    <DialogTitle>Sports AI Insight Generator</DialogTitle>
                  </div>
                  <DialogDescription>
                    Generate AI-powered insights for sports data by selecting a context and teams, then asking questions about performance, trends, or analytics.
                  </DialogDescription>
                </DialogHeader>
                
                {/* Two dropdowns side by side */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">League/Tournament</label>
                    <div className="relative">
                      <Select value={selectedLeague} onValueChange={setSelectedLeague}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a league or tournament" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableLeagues.map((league) => (
                            <SelectItem key={league.id} value={league.id}>
                              <div className="flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-blue-600" />
                                <span>{league.name}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedLeague && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-8 top-1/2 -translate-y-1/2 h-4 w-4 p-0 hover:bg-muted rounded-sm"
                          onClick={() => setSelectedLeague("")}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Team Selection</label>
                    <Popover open={isTeamPopoverOpen} onOpenChange={setIsTeamPopoverOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          className="w-full justify-between h-auto min-h-10 text-left"
                        >
                          <div className="flex-1 overflow-hidden">
                            {selectedTeams.length === 0 ? (
                              <span className="text-muted-foreground">Select teams</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {selectedTeams.map((teamId) => (
                                  <Badge
                                    key={teamId}
                                    variant="secondary"
                                    className="gap-1"
                                  >
                                    {getSelectedTeamName(teamId)}
                                    <X
                                      className="w-3 h-3 cursor-pointer hover:text-destructive"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTeamSelection(teamId);
                                      }}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent 
                        className="w-[var(--radix-popover-trigger-width)] p-0 max-h-[400px] overflow-hidden" 
                        align="start" 
                        sideOffset={4}
                      >
                        {availableTeams.length === 0 ? (
                          <div className="p-4 text-center text-sm text-muted-foreground">
                            No teams available. Add teams first.
                          </div>
                        ) : (
                          <div className="flex flex-col max-h-[400px]">
                            <ScrollArea className="flex-1 max-h-[340px]">
                              <div className="p-2">
                                {availableTeams.map((team) => (
                                  <div
                                    key={team.id}
                                    className="flex items-center gap-2 px-2 py-2 cursor-pointer hover:bg-accent rounded-sm"
                                    onClick={() => toggleTeamSelection(team.id)}
                                  >
                                    <Checkbox
                                      checked={selectedTeams.includes(team.id)}
                                      onCheckedChange={() => toggleTeamSelection(team.id)}
                                    />
                                    <Users className="w-4 h-4 text-blue-600" />
                                    <span className="flex-1 text-sm">{team.name}</span>
                                  </div>
                                ))}
                              </div>
                            </ScrollArea>
                            {selectedTeams.length > 0 && (
                              <div className="p-2 border-t shrink-0">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    clearAllTeams();
                                  }}
                                  className="w-full"
                                >
                                  Clear all ({selectedTeams.length})
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>

                {/* Central AI Assistant Area */}
                <div className="flex-1 bg-muted/30 rounded-lg p-8 mb-6 space-y-4">
                  {!aiResponse ? (
                    <div className="text-center space-y-4">
                      <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-2xl flex items-center justify-center mx-auto">
                        <Brain className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                      </div>
                      <h3 className="font-semibold text-lg">Sports AI Assistant</h3>
                      {loadingProvider ? (
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Loading AI provider...</span>
                        </div>
                      ) : !aiProvider ? (
                        <p className="text-muted-foreground max-w-md mx-auto">
                          No AI provider configured for sports dashboard. 
                          Please configure one in Settings → AI Connections.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-muted-foreground max-w-md mx-auto">
                            Select a league or tournament and teams above, then ask me to analyze team performance, 
                            predict game outcomes, assess player statistics, or provide strategic insights.
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
                          <span className="font-medium">AI Response</span>
                          <Badge variant="outline" className="text-xs">
                            {currentModel}
                          </Badge>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setAiResponse(null);
                            setCurrentQuestion("");
                            setCurrentModel("");
                            setInsightSaved(false);
                          }}
                        >
                          <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
                          New Question
                        </Button>
                      </div>
                      <ScrollArea className="h-[300px] border rounded-lg p-4">
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <div className="mb-3 pb-3 border-b">
                            <p className="text-sm font-medium text-muted-foreground mb-1">Question:</p>
                            <p className="text-sm">{currentQuestion}</p>
                          </div>
                          <div className="whitespace-pre-wrap text-sm">{aiResponse}</div>
                        </div>
                      </ScrollArea>
                      <div className="flex justify-end gap-2">
                        {insightSaved ? (
                          <Badge variant="outline" className="text-green-600">
                            ✓ Saved
                          </Badge>
                        ) : (
                          <Button
                            onClick={handleSaveInsight}
                            disabled={savingInsight}
                            size="sm"
                          >
                            {savingInsight ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              'Save Insight'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Chat Input Area */}
                {!aiResponse && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Ask AI Assistant</label>
                    <div className="flex gap-2">
                      <Textarea
                        value={chatMessage}
                        onChange={(e) => setChatMessage(e.target.value)}
                        placeholder="e.g., What are the team performance patterns and predictions?"
                        className="min-h-[60px]"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        disabled={!aiProvider || loadingProvider}
                      />
                      <Button 
                        onClick={handleSendMessage}
                        disabled={!chatMessage.trim() || sendingMessage || !aiProvider || loadingProvider}
                        size="icon"
                        className="shrink-0"
                      >
                        {sendingMessage ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Press Shift+Enter for new line, Enter to send
                    </p>
                  </div>
                )}
              </DialogContent>
            </Dialog>
            <div className="relative ml-4">
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
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory max-w-[calc(4*350px+3*1rem)]">
          {filteredInsights.map((insight) => {
            const teamInfo = getTeamInfo(insight);
            const borderColor = teamInfo?.primaryColor || '#a855f7'; // purple-400 fallback
            
            return (
              <Card key={insight.id} className="border-l-4 min-w-[350px] max-w-[350px] flex-shrink-0 snap-start" style={{ borderLeftColor: borderColor }}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Logo + Team Badge + Saved Insight Badge on same line */}
                      <div className="flex items-center gap-2">
                        {teamInfo?.logo ? (
                          <div 
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{ 
                              backgroundColor: teamInfo.primaryColor ? `${teamInfo.primaryColor}20` : '#f3f4f6'
                            }}
                          >
                            <img 
                              src={teamInfo.logo} 
                              alt={teamInfo.name}
                              className="w-6 h-6 object-contain"
                            />
                          </div>
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                            <Trophy className="w-5 h-5 text-purple-600" />
                          </div>
                        )}
                        
                        {teamInfo && (
                          <Badge 
                            variant="outline" 
                            className="text-xs"
                            style={{
                              borderColor: teamInfo.primaryColor || '#a855f7',
                              color: teamInfo.primaryColor || '#9333ea',
                              backgroundColor: teamInfo.primaryColor ? `${teamInfo.primaryColor}10` : '#faf5ff'
                            }}
                          >
                            {teamInfo.name}
                          </Badge>
                        )}
                        
                        <Badge variant="outline" className="text-purple-600 bg-purple-50 border-purple-200 text-xs">
                          Saved Insight
                        </Badge>
                      </div>
                      
                      {/* Question Title */}
                      <CardTitle className="text-base line-clamp-2">{insight.question}</CardTitle>
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
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                  {insight.response.split('\n')[0]}
                </p>
                
                <div className="space-y-2">
                  {insight.response && (
                    <Collapsible>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 px-0 text-xs">
                          <ChevronRight className="w-3 h-3 mr-1" />
                          Read Full Response
                        </Button>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-2">
                        <ScrollArea className="max-h-[200px]">
                          <div className="bg-muted/30 rounded-lg p-4 space-y-3 pr-4">
                          {(() => {
                            const response = insight.response;
                            // Split by lines and filter for bullet points or numbered items
                            const lines = response.split('\n').filter((line: string) => line.trim());
                            const bulletPoints = lines.filter((line: string) => 
                              line.trim().match(/^[-•*\d.]+\s+/) || 
                              (line.length > 10 && !lines[0]?.includes(line))
                            );
                            
                            if (bulletPoints.length === 0) {
                              // Fallback to original display if no bullet points found
                              return <div className="text-xs text-muted-foreground whitespace-pre-wrap">{response}</div>;
                            }
                            
                            return bulletPoints.map((point: string, idx: number) => {
                              // Remove bullet/number prefix
                              const cleanPoint = point.replace(/^[-•*\d.]+\s+/, '').trim();
                              
                              // Extract percentage (e.g., "65%", "12.5%")
                              const percentMatch = cleanPoint.match(/(\d+(?:\.\d+)?)\s*%/);
                              const percentage = percentMatch ? parseFloat(percentMatch[1]) : null;
                              
                              // Extract ratio (e.g., "3/10", "7/10")
                              const ratioMatch = cleanPoint.match(/(\d+)\s*\/\s*(\d+)/);
                              const ratio = ratioMatch ? (parseFloat(ratioMatch[1]) / parseFloat(ratioMatch[2])) * 100 : null;
                              
                              // Determine sentiment/color
                              const hasPositive = /win|victory|strong|high confidence|advantage|improve/i.test(cleanPoint);
                              const hasNegative = /loss|defeat|weak|low confidence|disadvantage|decline/i.test(cleanPoint);
                              const hasWarning = /risk|caution|uncertain|moderate|concern/i.test(cleanPoint);
                              
                              const displayValue = percentage || ratio;
                              
                              // Get topic icon
                              const { Icon: TopicIcon, color: iconColor } = getTopicIcon(cleanPoint);
                              
                              return (
                                <div key={idx} className="flex items-start gap-3 text-sm">
                                  <div className="shrink-0 mt-0.5">
                                    <TopicIcon className={`w-4 h-4 ${iconColor}`} />
                                  </div>
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
                                  </div>
                                </div>
                              );
                            });
                          })()}
                          </div>
                        </ScrollArea>
                      </CollapsibleContent>
                    </Collapsible>
                  )}
                  
                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{insight.provider || 'AI'}</span>
                    <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })}
          </div>

          {filteredInsights.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              {searchQuery ? 'No insights found matching your search.' : 'No saved insights yet. Click "Add AI Insight" to generate your first one.'}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}