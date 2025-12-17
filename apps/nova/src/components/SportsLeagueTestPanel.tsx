import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { Checkbox } from "./ui/checkbox";
import { 
  Trophy, 
  Play, 
  CheckCircle2,
  CheckCircle,
  XCircle, 
  Loader2, 
  Users,
  BarChart3,
  Database,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Info,
  X
} from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible";

interface TestResult {
  step: string;
  status: 'success' | 'error' | 'pending';
  message: string;
  details?: any;
  timestamp: string;
}

interface TeamData {
  id: string;
  name: string;
  abbrev: string;
  city: string;
  league_id: string;
  stats: {
    played: number;
    wins: number;
    draws: number;
    losses: number;
    points: number;
  };
  providers?: {
    sportradar?: {
      sr_id: string;
      sr_competition_id: string;
    };
  };
}

export function SportsLeagueTestPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [leagueSeasonItems, setLeagueSeasonItems] = useState<any[]>([]); // Flattened league-season combos
  const [selectedLeague, setSelectedLeague] = useState<any>(null);
  const [selectedLeagueSeasons, setSelectedLeagueSeasons] = useState<Set<string>>(new Set()); // Multi-select
  const [teamsBeforeTest, setTeamsBeforeTest] = useState<TeamData[]>([]);
  const [teamsAfterTest, setTeamsAfterTest] = useState<TeamData[]>([]);
  const [testResponse, setTestResponse] = useState<any>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const [activeProvider, setActiveProvider] = useState<any>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);
  const [testingConnection, setTestingConnection] = useState(false);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const toggleLeagueSeasonSelection = (uniqueKey: string) => {
    setSelectedLeagueSeasons(prev => {
      const next = new Set(prev);
      if (next.has(uniqueKey)) {
        next.delete(uniqueKey);
      } else {
        next.add(uniqueKey);
      }
      return next;
    });
  };

  const clearAllSelections = () => {
    setSelectedLeagueSeasons(new Set());
  };

  const selectAllVisible = () => {
    const allKeys = new Set(leagueSeasonItems.map(item => item.uniqueKey));
    setSelectedLeagueSeasons(allKeys);
  };

  const addTestResult = (step: string, status: 'success' | 'error' | 'pending', message: string, details?: any) => {
    setTestResults(prev => [...prev, {
      step,
      status,
      message,
      details,
      timestamp: new Date().toISOString()
    }]);
  };

  useEffect(() => {
    checkActiveProvider();
  }, []);

  const checkActiveProvider = async () => {
    setLoadingProvider(true);
    try {
      // Use backend endpoint that internally uses RPC for provider details
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/providers/active'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        console.error('[LeagueTest] Failed to fetch active provider:', response.status);
        setActiveProvider(null);
        return;
      }

      const data = await response.json();
      console.log('[LeagueTest] Provider response:', data);
      
      if (!data.provider) {
        console.log('[LeagueTest] No active sports provider configured');
        setActiveProvider(null);
        return;
      }

      console.log('[LeagueTest] Using provider:', data.provider);
      setActiveProvider(data.provider);
    } catch (error) {
      console.error('[LeagueTest] Error checking active provider:', error);
      setActiveProvider(null);
    } finally {
      setLoadingProvider(false);
    }
  };

  const handleTestConnection = async () => {
    if (!activeProvider) return;
    
    setTestingConnection(true);
    try {
      toast.info("Testing SportMonks provider configuration...");
      
      const issues = [];
      if (!activeProvider.api_key) {
        issues.push("API key not configured");
      }
      if (!activeProvider.base_url) {
        issues.push("Base URL not configured");
      }
      
      if (issues.length > 0) {
        toast.error(`Configuration issues: ${issues.join(", ")}`);
      } else {
        toast.success("Provider configuration looks valid");
      }
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error("Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const loadAvailableLeagues = async () => {
    if (!activeProvider) {
      console.log('[SportMonks Leagues] No active provider found:', activeProvider);
      toast.error('No active sports provider configured');
      addTestResult('Load Leagues', 'error', 'No active sports provider found. Please configure a provider in Data Feeds.');
      return;
    }

    console.log('[SportMonks Leagues] Using provider:', activeProvider);
    
    setIsLoading(true);
    setTestResults([]);
    setSelectedLeagueSeasons(new Set()); // Clear selections
    addTestResult('Load Leagues', 'pending', `Fetching all leagues with seasons from ${activeProvider.name}...`);
    
    try {
      const providerType = activeProvider.type.toLowerCase();
      
      if (providerType !== 'sportmonks') {
        addTestResult('Load Leagues', 'error', `This feature requires SportMonks provider. Current: ${providerType}`);
        setIsLoading(false);
        return;
      }
      
      // Use backend endpoint to avoid CORS issues
      const endpoint = getEdgeFunctionUrl('sports_dashboard/sports/sportmonks/soccer/leagues');
      console.log('[SportMonks] Fetching from backend:', endpoint);
      
      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${getSupabaseAnonKey()}`,
          'apikey': getSupabaseAnonKey(),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[SportMonks] Backend failed:', response.status, errorText);
        addTestResult('Load Leagues', 'error', `Backend API failed: ${response.status} - ${errorText}`);
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      console.log('[SportMonks] Backend response:', data);
      
      // resp is the JSON you pasted (with resp.data = leagues)
      const leagues = Array.isArray(data?.data) ? data.data : [];
      console.log('[SportMonks] Parsed leagues:', leagues.length);
      setAvailableLeagues(leagues);
      
      // Transform leagues into league-season combinations
      const combos: any[] = [];
      
      for (const lg of leagues) {
        // v3 leagues?include=seasons returns a plain array (not {data: []})
        const seasons = Array.isArray(lg.seasons) ? lg.seasons : (lg.seasons?.data ?? []);
        
        if (!seasons.length) {
          combos.push({
            id: lg.id,
            name: lg.name,
            sport: 'football',               // don't use lg.type ('league'/'play-offs') as sport
            abbrev: lg.short_code ?? null,
            selectedSeason: null,
            displayName: lg.name,
            seasonId: null,
            seasonName: 'No Season',
            uniqueKey: `${lg.id}-no-season`,
          });
          continue;
        }
        
        // choose the current season for selectedSeason
        const current = seasons.find((s: any) => s.is_current) ?? seasons[seasons.length - 1];
        
        for (const s of seasons) {
          combos.push({
            id: lg.id,
            name: lg.name,
            sport: 'football',
            abbrev: lg.short_code ?? null,
            selectedSeason: current?.id ?? null,
            displayName: lg.name,
            seasonId: s.id,
            seasonName: s.name,
            uniqueKey: `${lg.id}-${s.id}`,
          });
        }
      }
      
      console.log('[SportMonks] Created league-season combinations:', combos.length);
      
      // Log sample for debugging
      if (combos.length > 0) {
        console.log('[SportMonks] Sample combination:', combos[0]);
      }
      
      setLeagueSeasonItems(combos);
      
      addTestResult('Load Leagues', 'success', 
        `Loaded ${leagues.length} leagues with ${combos.length} league-season combinations from SportMonks`
      );
      
      toast.success(`Loaded ${combos.length} league-season combinations`);
    } catch (error) {
      console.error('[SportMonks] Error loading leagues:', error);
      addTestResult('Load Leagues', 'error', `Error loading leagues: ${error}`);
      toast.error(`Failed to load leagues: ${error}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSelectedLeagues = async () => {
    if (selectedLeagueSeasons.size === 0) {
      toast.error('Please select at least one league-season combination');
      return;
    }

    setIsLoading(true);
    
    // Show loading toast
    const loadingToast = toast.loading(`Saving ${selectedLeagueSeasons.size} league-season combinations to database...`);
    
    try {
      // Get selected items
      const selectedItems = leagueSeasonItems.filter(item => 
        selectedLeagueSeasons.has(item.uniqueKey)
      );

      console.log('[SaveLeagues] Saving', selectedItems.length, 'league-season combinations');

      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/save-leagues'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({ leagues: selectedItems }),
        }
      );

      // Dismiss loading toast
      toast.dismiss(loadingToast);

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'Unknown error';
        try {
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.error || errorData.details || errorText;
        } catch {
          errorMessage = errorText;
        }
        
        console.error('[SaveLeagues] Save failed:', errorMessage);
        addTestResult('Save Leagues', 'error', `Failed to save leagues: ${errorMessage}`);
        toast.error(`Failed to save leagues to database: ${errorMessage}`, {
          duration: 5000,
        });
        return;
      }

      const result = await response.json();
      console.log('[SaveLeagues] Result:', result);

      const savedCount = result.saved || selectedItems.length;

      addTestResult('Save Leagues', 'success', 
        `Successfully saved ${savedCount} league-season combinations to sports_leagues table`
      );

      toast.success(`✓ Successfully saved ${savedCount} league-season combinations to Supabase`, {
        duration: 4000,
      });
      
      // Clear selections after successful save
      setSelectedLeagueSeasons(new Set());
      
    } catch (error) {
      console.error('[SaveLeagues] Error:', error);
      
      // Dismiss loading toast if still showing
      toast.dismiss(loadingToast);
      
      const errorMessage = error instanceof Error ? error.message : String(error);
      addTestResult('Save Leagues', 'error', `Error saving leagues: ${errorMessage}`);
      
      toast.error(`Failed to save leagues to database: ${errorMessage}`, {
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCurrentTeams = async () => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/teams'),
        {
          headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` },
        }
      );

      if (response.ok) {
        const data = await response.json();
        return data.teams || [];
      }
      return [];
    } catch (error) {
      console.error('Error fetching teams:', error);
      return [];
    }
  };

  const runFullTest = async (league: any) => {
    setIsLoading(true);
    setTestResults([]);
    setSelectedLeague(league);
    setTestResponse(null);
    
    addTestResult('Initialize', 'pending', `Starting test for ${league.name}...`);

    // Step 1: Fetch teams before test
    addTestResult('Pre-Test Check', 'pending', 'Fetching current teams...');
    const teamsBefore = await fetchCurrentTeams();
    setTeamsBeforeTest(teamsBefore);
    addTestResult('Pre-Test Check', 'success', `Found ${teamsBefore.length} teams in database`, {
      teamCount: teamsBefore.length,
      teamsInLeague: teamsBefore.filter((t: any) => t.league_id === league.id).length
    });

    // Step 2: Call add-league endpoint
    addTestResult('Add League API', 'pending', `Calling /sports/add-league endpoint...`);
    
    try {
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/add-league'),
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            leagueId: league.id,
            seasonId: league.seasonId || league.selectedSeason?.id,
            leagueData: {
              name: league.name,
              displayName: league.displayName,
              sport: league.sport,
              abbrev: league.abbrev,
              seasonId: league.seasonId || league.selectedSeason?.id,
              seasonName: league.seasonName || league.selectedSeason?.name
            },
            competitionId: league.providers?.sportradar?.sr_competition_id,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        addTestResult('Add League API', 'error', `API returned ${response.status}`, errorData);
        setIsLoading(false);
        return;
      }

      const responseData = await response.json();
      setTestResponse(responseData);
      addTestResult('Add League API', 'success', `Successfully added ${responseData.teamsAdded} teams`, responseData);

      // Step 3: Fetch teams after test
      addTestResult('Post-Test Check', 'pending', 'Fetching updated teams...');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait for backend update
      const teamsAfter = await fetchCurrentTeams();
      setTeamsAfterTest(teamsAfter);

      const newTeams = teamsAfter.filter((t: any) => 
        !teamsBefore.find((tb: any) => tb.id === t.id)
      );

      addTestResult('Post-Test Check', 'success', `Found ${teamsAfter.length} teams (${newTeams.length} new)`, {
        totalTeams: teamsAfter.length,
        newTeams: newTeams.length,
        teamsInLeague: teamsAfter.filter((t: any) => t.league_id === league.id).length
      });

      // Step 4: Verify team data
      addTestResult('Data Verification', 'pending', 'Verifying team data structure...');
      
      const teamsInLeague = teamsAfter.filter((t: any) => t.league_id === league.id);
      const teamsWithStats = teamsInLeague.filter((t: any) => t.stats && t.stats.played !== undefined);
      const teamsWithProviders = teamsInLeague.filter((t: any) => t.providers?.sportradar?.sr_id);
      const teamsWithProfile = teamsInLeague.filter((t: any) => t.country || t.venue || t.manager);
      const teamsWithLogos = teamsInLeague.filter((t: any) => t.brand?.logos && t.brand.logos.length > 0);

      if (teamsInLeague.length === 0) {
        addTestResult('Data Verification', 'error', 'No teams found for this league', {
          leagueId: league.id,
          totalTeams: teamsAfter.length
        });
      } else if (teamsWithStats.length !== teamsInLeague.length) {
        addTestResult('Data Verification', 'error', `${teamsInLeague.length - teamsWithStats.length} teams missing stats`, {
          teamsInLeague: teamsInLeague.length,
          teamsWithStats: teamsWithStats.length
        });
      } else if (teamsWithProviders.length !== teamsInLeague.length) {
        addTestResult('Data Verification', 'error', `${teamsInLeague.length - teamsWithProviders.length} teams missing provider data`, {
          teamsInLeague: teamsInLeague.length,
          teamsWithProviders: teamsWithProviders.length
        });
      } else {
        addTestResult('Data Verification', 'success', 'All teams have valid data structure', {
          teamsInLeague: teamsInLeague.length,
          teamsWithStats: teamsWithStats.length,
          teamsWithProviders: teamsWithProviders.length,
          teamsWithProfile: teamsWithProfile.length,
          teamsWithLogos: teamsWithLogos.length,
          enrichmentRate: `${Math.round((teamsWithProfile.length / teamsInLeague.length) * 100)}%`,
          sampleTeam: teamsInLeague[0]
        });
      }

      // Step 5: Verify league linking
      addTestResult('League Linking', 'pending', 'Verifying league associations...');
      
      const correctlyLinked = teamsInLeague.every((t: any) => t.league_id === league.id);
      const competitionMatches = teamsInLeague.every((t: any) => 
        t.providers?.sportradar?.sr_competition_id === league.providers?.sportradar?.sr_competition_id
      );

      if (!correctlyLinked) {
        addTestResult('League Linking', 'error', 'Some teams have incorrect league_id');
      } else if (!competitionMatches) {
        addTestResult('League Linking', 'error', 'Some teams have mismatched competition IDs');
      } else {
        addTestResult('League Linking', 'success', 'All teams correctly linked to league', {
          leagueId: league.id,
          competitionId: league.providers?.sportradar?.sr_competition_id,
          linkedTeams: teamsInLeague.length
        });
      }

      toast.success(`Test completed: ${responseData.teamsAdded} teams added successfully`);

    } catch (error) {
      addTestResult('Add League API', 'error', `Error: ${error}`, { error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5" />
            Sports League Testing Panel
          </CardTitle>
          <CardDescription>
            Test the /sports/add-league endpoint and verify team data, stats, and league linking
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Provider Status */}
          {loadingProvider ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking provider...
            </div>
          ) : activeProvider ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  {activeProvider.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  API Key: {activeProvider.api_key ? '✓ Configured' : '✗ Not Set'}
                </span>
                <Button 
                  onClick={checkActiveProvider}
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  disabled={loadingProvider}
                >
                  <RefreshCw className={`w-3 h-3 ${loadingProvider ? 'animate-spin' : ''}`} />
                  Refresh Status
                </Button>
              </div>
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                className="w-full gap-2"
              >
                {testingConnection ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Test Provider Configuration
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 p-3 border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/10 rounded">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <span className="text-sm">
                No active SportMonks provider found. Please configure a provider in Data Feeds.
              </span>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button 
              onClick={loadAvailableLeagues} 
              disabled={isLoading || loadingProvider || !activeProvider}
              className="gap-2"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Load All Leagues & Seasons
            </Button>
            <Button 
              onClick={saveSelectedLeagues} 
              disabled={isLoading || selectedLeagueSeasons.size === 0}
              className="gap-2"
              variant="default"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Database className="w-4 h-4" />
              )}
              Save Selected to Database
            </Button>
            {leagueSeasonItems.length > 0 && (
              <>
                <Badge variant="secondary">{leagueSeasonItems.length} available</Badge>
                <Badge variant="default">{selectedLeagueSeasons.size} selected</Badge>
              </>
            )}
          </div>

          {leagueSeasonItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-sm">Select League-Seasons (Multi-Select):</label>
                <div className="flex gap-2">
                  <Button 
                    onClick={selectAllVisible} 
                    variant="outline" 
                    size="sm"
                    disabled={isLoading}
                  >
                    Select All
                  </Button>
                  <Button 
                    onClick={clearAllSelections} 
                    variant="outline" 
                    size="sm"
                    disabled={isLoading || selectedLeagueSeasons.size === 0}
                  >
                    Clear All
                  </Button>
                </div>
              </div>

              {/* Selected Items Summary */}
              {selectedLeagueSeasons.size > 0 && (
                <Card className="border-primary bg-primary/5">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm">Selected ({selectedLeagueSeasons.size}):</span>
                      <Button 
                        onClick={clearAllSelections} 
                        variant="ghost" 
                        size="sm"
                        className="h-6 gap-1"
                      >
                        <X className="w-3 h-3" />
                        Clear
                      </Button>
                    </div>
                    <ScrollArea className="max-h-[120px]">
                      <div className="flex flex-wrap gap-1">
                        {leagueSeasonItems
                          .filter(item => selectedLeagueSeasons.has(item.uniqueKey))
                          .map(item => (
                            <Badge 
                              key={item.uniqueKey} 
                              variant="default"
                              className="gap-1 cursor-pointer hover:bg-destructive"
                              onClick={() => toggleLeagueSeasonSelection(item.uniqueKey)}
                            >
                              {item.displayName}
                              <X className="w-3 h-3" />
                            </Badge>
                          ))}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              )}

              {/* Scrollable Multi-Select List */}
              <ScrollArea className="h-[500px] pr-4 border rounded-md">
                <div className="p-2 space-y-1">
                  {leagueSeasonItems.map((item, index) => {
                    const isSelected = selectedLeagueSeasons.has(item.uniqueKey);
                    return (
                      <Card 
                        key={item.uniqueKey}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/5' 
                            : 'hover:border-primary/50'
                        }`}
                        onClick={() => !isLoading && toggleLeagueSeasonSelection(item.uniqueKey)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3">
                            <Checkbox 
                              checked={isSelected}
                              onCheckedChange={() => toggleLeagueSeasonSelection(item.uniqueKey)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="truncate">{item.displayName}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                Season: {item.seasonName}
                              </p>
                              <div className="flex gap-1 mt-1">
                                <Badge variant="outline" className="text-xs">{item.sport}</Badge>
                                {item.abbrev && <Badge variant="secondary" className="text-xs">{item.abbrev}</Badge>}
                              </div>
                              <div className="mt-2 pt-2 border-t">
                                <p className="text-xs text-muted-foreground">
                                  League ID: <span className="font-mono">{item.id}</span>
                                  {item.seasonId && (
                                    <>
                                      {' | '}
                                      Season ID: <span className="font-mono">{item.seasonId}</span>
                                    </>
                                  )}
                                </p>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </ScrollArea>
            </div>
          )}
        </CardContent>
      </Card>

      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-3">
                {testResults.map((result, index) => (
                  <Card key={index} className={
                    result.status === 'success' ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/10' :
                    result.status === 'error' ? 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/10' :
                    'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/10'
                  }>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        {result.status === 'success' && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />}
                        {result.status === 'error' && <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />}
                        {result.status === 'pending' && <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs opacity-60">
                              {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="mt-1">{result.message}</p>
                          {result.details && (
                            <details className="mt-2">
                              <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                                View details
                              </summary>
                              <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                                {JSON.stringify(result.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {(teamsBeforeTest.length > 0 || teamsAfterTest.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Before Test */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Database className="w-4 h-4" />
                Before Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Teams:</span>
                  <Badge>{teamsBeforeTest.length}</Badge>
                </div>
                {selectedLeague && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In {selectedLeague.abbrev}:</span>
                    <Badge>{teamsBeforeTest.filter(t => t.league_id === selectedLeague.id).length}</Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* After Test */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                After Test
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Teams:</span>
                  <Badge variant={teamsAfterTest.length > teamsBeforeTest.length ? "default" : "secondary"}>
                    {teamsAfterTest.length}
                    {teamsAfterTest.length > teamsBeforeTest.length && (
                      <span className="ml-1 text-green-600">
                        (+{teamsAfterTest.length - teamsBeforeTest.length})
                      </span>
                    )}
                  </Badge>
                </div>
                {selectedLeague && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">In {selectedLeague.abbrev}:</span>
                    <Badge variant="default">
                      {teamsAfterTest.filter(t => t.league_id === selectedLeague.id).length}
                    </Badge>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Team Details */}
      {teamsAfterTest.length > 0 && selectedLeague && (
        <Card>
          <Collapsible 
            open={expandedSections.has('teams')}
            onOpenChange={() => toggleSection('teams')}
          >
            <CardHeader className="cursor-pointer" onClick={() => toggleSection('teams')}>
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between w-full">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Teams Added ({teamsAfterTest.filter(t => t.league_id === selectedLeague.id).length})
                  </CardTitle>
                  {expandedSections.has('teams') ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </div>
              </CollapsibleTrigger>
            </CardHeader>
            <CollapsibleContent>
              <CardContent>
                <ScrollArea className="h-[400px] pr-4">
                  <div className="space-y-2">
                    {teamsAfterTest
                      .filter(t => t.league_id === selectedLeague.id)
                      .map((team) => (
                        <Card key={team.id} className="border-l-4 border-l-primary">
                          <CardContent className="p-3">
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <div>
                                  <p className="font-medium">{team.name}</p>
                                  <p className="text-xs text-muted-foreground">{team.id}</p>
                                </div>
                                <Badge variant="outline">{team.abbrev}</Badge>
                              </div>
                              
                              {team.stats && (
                                <div className="grid grid-cols-5 gap-2 text-center text-xs">
                                  <div>
                                    <p className="text-muted-foreground">P</p>
                                    <p className="font-medium">{team.stats.played}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">W</p>
                                    <p className="font-medium">{team.stats.wins}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">D</p>
                                    <p className="font-medium">{team.stats.draws}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">L</p>
                                    <p className="font-medium">{team.stats.losses}</p>
                                  </div>
                                  <div>
                                    <p className="text-muted-foreground">Pts</p>
                                    <p className="font-medium">{team.stats.points}</p>
                                  </div>
                                </div>
                              )}

                              {team.providers?.sportradar && (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Database className="w-3 h-3" />
                                  <span>SR ID: {team.providers.sportradar.sr_id}</span>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </CollapsibleContent>
          </Collapsible>
        </Card>
      )}

      {testResponse && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              API Response Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Competition:</span>
                <span className="font-medium">{testResponse.competitionName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Season:</span>
                <span className="font-medium">{testResponse.seasonName}</span>
              </div>
              {testResponse.seasonId && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Season ID:</span>
                  <code className="text-xs bg-muted px-2 py-1 rounded">{testResponse.seasonId}</code>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Teams Added:</span>
                <Badge variant="default">{testResponse.teamsAdded}</Badge>
              </div>
              <Separator className="my-2" />
              <details>
                <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
                  View full response
                </summary>
                <pre className="text-xs mt-2 p-2 bg-muted rounded overflow-x-auto">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </details>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
