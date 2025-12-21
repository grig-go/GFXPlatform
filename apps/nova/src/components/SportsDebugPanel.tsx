import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Bug, Database, Trophy, Users, AlertCircle, CheckCircle2, XCircle, Loader2, TrendingUp, Play, CheckCircle, RefreshCw } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { SportsLeagueTestPanel } from "./SportsLeagueTestPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";

interface StandingsDebugLog {
  timestamp: string;
  leagueId: string;
  leagueName: string;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
  };
  response?: {
    status: number;
    statusText: string;
    body: any;
    error?: string;
  };
  providerInfo?: any;
  seasonInfo?: any;
  teamsInfo?: any;
}

export function SportsDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [standingsLogs, setStandingsLogs] = useState<StandingsDebugLog[]>([]);
  const [selectedLeagueForStandings, setSelectedLeagueForStandings] = useState<string>("");
  const [isTestingStandings, setIsTestingStandings] = useState(false);
  const [isRefreshingBranding, setIsRefreshingBranding] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('=== SPORTS DEBUG DIAGNOSTICS ===');
      
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        providers: [],
        tournaments: [],
        teams: [],
        issues: [],
        relationships: {
          tournamentIds: [],
          teamLeagueIds: [],
          mismatches: []
        }
      };

      // 1. Fetch Sports Providers using RPC pattern (same as Finance Dashboard)
      console.log('[Debug] Fetching sports providers from data_providers table...');
      
      try {
        // Step 1: Get provider list from public view (IDs only)
        const listResponse = await fetch(
          getRestUrl('data_providers_public?select=id,name,type,category,is_active&category=eq.sports'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
              apikey: getSupabaseAnonKey(),
            },
          }
        );

        if (!listResponse.ok) {
          throw new Error(`HTTP ${listResponse.status}: ${listResponse.statusText}`);
        }

        const providerList = await listResponse.json();
        console.log(`[Debug] Found ${providerList.length} sports providers in database`);
        
        // Step 2: Fetch full details for each provider using secure RPC function
        const providersWithDetails = [];
        for (const provider of providerList) {
          const rpcResponse = await fetch(
            getRestUrl('rpc/get_provider_details'),
            {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${getSupabaseAnonKey()}`,
                apikey: getSupabaseAnonKey(),
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ p_id: provider.id }),
            }
          );

          if (rpcResponse.ok) {
            const details = await rpcResponse.json();
            if (details && details.length > 0) {
              const p = details[0];
              providersWithDetails.push({
                id: p.id,
                name: p.name,
                type: p.type,
                category: p.category,
                status: p.is_active ? 'active' : 'inactive',
                isActive: p.is_active,
                configured: p.api_key ? true : false,
                apiKeyConfigured: p.api_key ? true : false,
                apiKey: p.api_key, // UNMASKED via RPC
                baseUrl: p.base_url,
                apiVersion: p.api_version,
                config: p.config || {},
                description: p.description,
                createdAt: p.created_at,
                updatedAt: p.updated_at,
              });
            }
          }
        }
        
        diagnostics.providers = providersWithDetails;
        console.log(`[Debug] Loaded ${diagnostics.providers.length} providers with full details:`, diagnostics.providers);
      } catch (error) {
        console.error('[Debug] Error fetching providers:', error);
        diagnostics.issues.push({
          type: 'error',
          message: `Failed to fetch providers: ${error instanceof Error ? error.message : String(error)}`
        });
        diagnostics.providers = [];
      }

      // 2. Fetch Tournaments
      console.log('[Debug] Fetching tournaments...');
      const tournamentsRes = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/tournaments'),
        { headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` } }
      );
      
      if (tournamentsRes.ok) {
        const tournamentsData = await tournamentsRes.json();
        diagnostics.tournaments = tournamentsData.tournaments || [];
        diagnostics.relationships.tournamentIds = diagnostics.tournaments.map((t: any) => t.id);
        console.log(`[Debug] Found ${diagnostics.tournaments.length} tournaments:`, diagnostics.tournaments);
      } else {
        diagnostics.issues.push({
          type: 'error',
          message: `Failed to fetch tournaments: ${tournamentsRes.status}`
        });
      }

      // 3. Fetch Teams
      console.log('[Debug] Fetching teams...');
      const teamsRes = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/teams'),
        { headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` } }
      );
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        diagnostics.teams = teamsData.teams || [];
        diagnostics.relationships.teamLeagueIds = [...new Set(diagnostics.teams.map((t: any) => t.league_id))];
        console.log(`[Debug] Found ${diagnostics.teams.length} teams:`, diagnostics.teams);
      } else {
        diagnostics.issues.push({
          type: 'error',
          message: `Failed to fetch teams: ${teamsRes.status}`
        });
      }

      // 4. Analyze Relationships
      console.log('[Debug] Analyzing relationships...');
      
      // Check for tournament/team league_id mismatches
      diagnostics.relationships.teamLeagueIds.forEach((leagueId: string) => {
        if (!diagnostics.relationships.tournamentIds.includes(leagueId)) {
          diagnostics.relationships.mismatches.push({
            type: 'orphan_league_id',
            leagueId,
            message: `Teams reference league_id "${leagueId}" but no tournament with that ID exists`
          });
        }
      });

      // Check for empty providers
      diagnostics.providers.forEach((provider: any) => {
        if (!provider.selectedLeagues || provider.selectedLeagues.length === 0) {
          diagnostics.issues.push({
            type: 'warning',
            message: `Provider "${provider.name}" has no selected leagues`
          });
        }
        
        if (!provider.isActive) {
          diagnostics.issues.push({
            type: 'info',
            message: `Provider "${provider.name}" is not active`
          });
        }
      });

      // Check for empty data
      if (diagnostics.providers.length === 0) {
        diagnostics.issues.push({
          type: 'error',
          message: 'No sports providers found. Run "Initialize & Sync" first.'
        });
      }
      
      if (diagnostics.tournaments.length === 0) {
        diagnostics.issues.push({
          type: 'error',
          message: 'No tournaments/leagues synced. Make sure providers have selected leagues and sync has run.'
        });
      }
      
      if (diagnostics.teams.length === 0) {
        diagnostics.issues.push({
          type: 'error',
          message: 'No teams synced. Tournaments must be synced successfully before teams appear.'
        });
      }

      // Group teams by league_id
      const teamsByLeague: Record<string, any[]> = {};
      diagnostics.teams.forEach((team: any) => {
        if (!teamsByLeague[team.league_id]) {
          teamsByLeague[team.league_id] = [];
        }
        teamsByLeague[team.league_id].push(team);
      });
      diagnostics.teamsByLeague = teamsByLeague;

      console.log('=== DIAGNOSTICS COMPLETE ===');
      console.log('Full diagnostics:', diagnostics);
      
      setDebugData(diagnostics);
      
      if (diagnostics.issues.filter((i: any) => i.type === 'error').length === 0) {
        toast.success('Diagnostics complete - No critical issues found');
      } else {
        toast.warning('Diagnostics complete - Issues found');
      }
      
    } catch (error) {
      console.error('[Debug] Error running diagnostics:', error);
      toast.error('Failed to run diagnostics');
      setDebugData({ error: String(error) });
    } finally {
      setIsLoading(false);
    }
  };

  const runCleanup = async () => {
    setIsCleaningUp(true);
    try {
      console.log('[Cleanup] Starting tournament deduplication...');
      
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/tournaments/cleanup'),
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` },
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Cleanup] Result:', result);
        toast.success(result.message || `Removed ${result.duplicatesRemoved} duplicate tournaments`);
        
        // Re-run diagnostics to refresh data
        await runDiagnostics();
      } else {
        const error = await response.text();
        console.error('[Cleanup] Error:', error);
        toast.error('Failed to cleanup duplicates');
      }
    } catch (error) {
      console.error('[Cleanup] Error:', error);
      toast.error('Failed to cleanup duplicates');
    } finally {
      setIsCleaningUp(false);
    }
  };

  const testStandings = async (leagueId: string) => {
    setIsTestingStandings(true);
    const logEntry: StandingsDebugLog = {
      timestamp: new Date().toISOString(),
      leagueId,
      leagueName: debugData.tournaments?.find((t: any) => t.id === leagueId)?.name || leagueId,
      request: {
        url: getEdgeFunctionUrl(`sports_dashboard/sports/standings/${leagueId}`),
        method: 'GET',
        headers: {
          Authorization: `Bearer ${getSupabaseAnonKey().substring(0, 20)}...`
        }
      }
    };

    try {
      console.log('🔍 [Standings Test] Starting test for:', leagueId);
      console.log('📡 [Standings Test] Request URL:', logEntry.request.url);

      // Fetch provider info using RPC pattern
      console.log('🔧 [Standings Test] Fetching provider info from data_providers table...');
      
      try {
        const listResponse = await fetch(
          getRestUrl('data_providers_public?select=id,name,type,category,is_active&category=eq.sports'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
              apikey: getSupabaseAnonKey(),
            },
          }
        );

        if (listResponse.ok) {
          const providerList = await listResponse.json();
          const providersWithDetails = [];
          
          for (const provider of providerList) {
            const rpcResponse = await fetch(
              getRestUrl('rpc/get_provider_details'),
              {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${getSupabaseAnonKey()}`,
                  apikey: getSupabaseAnonKey(),
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ p_id: provider.id }),
              }
            );

            if (rpcResponse.ok) {
              const details = await rpcResponse.json();
              if (details && details.length > 0) {
                providersWithDetails.push(details[0]);
              }
            }
          }
          
          logEntry.providerInfo = providersWithDetails;
          console.log('✅ [Standings Test] Provider info:', providersWithDetails);
        }
      } catch (error) {
        console.error('❌ [Standings Test] Error fetching provider info:', error);
      }

      // Fetch teams info
      console.log('👥 [Standings Test] Fetching teams info...');
      const teamsRes = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/teams'),
        { headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` } }
      );
      
      if (teamsRes.ok) {
        const teamsData = await teamsRes.json();
        const leagueTeams = teamsData.teams?.filter((t: any) => t.league_id === leagueId) || [];
        logEntry.teamsInfo = {
          totalTeams: teamsData.teams?.length || 0,
          teamsForThisLeague: leagueTeams.length,
          sampleTeams: leagueTeams.slice(0, 3)
        };
        console.log('✅ [Standings Test] Teams info:', logEntry.teamsInfo);
      }

      // Now test the standings endpoint
      console.log('📊 [Standings Test] Calling standings endpoint...');
      const response = await fetch(logEntry.request.url, {
        headers: { Authorization: `Bearer ${getSupabaseAnonKey()}` }
      });

      const responseBody = await response.json().catch(() => null);
      
      logEntry.response = {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        error: response.ok ? undefined : (responseBody?.error || responseBody?.details || response.statusText)
      };

      // If there's an error with details, try to parse Sportsradar error
      if (responseBody?.details) {
        try {
          const detailsObj = typeof responseBody.details === 'string' 
            ? JSON.parse(responseBody.details) 
            : responseBody.details;
          logEntry.response.sportsradarError = detailsObj;
          console.log('🔴 [Standings Test] Sportsradar Error:', detailsObj);
        } catch (e) {
          // details is not JSON, keep as-is
        }
      }

      console.log('📬 [Standings Test] Response status:', response.status);
      console.log('📬 [Standings Test] Response body:', responseBody);

      if (!response.ok) {
        console.error('❌ [Standings Test] Error:', logEntry.response.error);
        toast.error(`Test failed: ${logEntry.response.error}`);
      } else if (responseBody?.error) {
        console.error('❌ [Standings Test] Error in response:', responseBody.error);
        toast.error(`Test failed: ${responseBody.error}`);
      } else {
        console.log('✅ [Standings Test] Success!');
        toast.success('Standings test completed successfully');
      }

    } catch (error) {
      console.error('💥 [Standings Test] Exception:', error);
      logEntry.response = {
        status: 0,
        statusText: 'Network Error',
        body: null,
        error: error instanceof Error ? error.message : String(error)
      };
      toast.error(`Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setStandingsLogs(prev => [logEntry, ...prev]);
      setIsTestingStandings(false);
    }
  };

  const refreshBranding = async (leagueId?: string) => {
    setIsRefreshingBranding(true);
    try {
      console.log('[Refresh Branding] Starting...');
      
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/refresh-branding'),
        {
          method: 'POST',
          headers: { 
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ leagueId })
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        console.log('[Refresh Branding] Result:', result);
        toast.success(result.message || `Updated ${result.teamsUpdated} teams with ${result.teamsWithColors} custom colors`);
        
        // Re-run diagnostics to refresh data
        await runDiagnostics();
      } else {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        console.error('[Refresh Branding] Error:', error);
        toast.error(error.error || 'Failed to refresh team branding');
      }
    } catch (error) {
      console.error('[Refresh Branding] Error:', error);
      toast.error('Failed to refresh team branding');
    } finally {
      setIsRefreshingBranding(false);
    }
  };

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2"
          onClick={runDiagnostics}
        >
          <Bug className="w-4 h-4" />
          Debug
        </Button>
      </DialogTrigger>
      <DialogContent className="!max-w-[1536px] max-h-[90vh] w-[95vw] sm:!max-w-[1536px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="w-5 h-5" />
            Sports Data Diagnostics
          </DialogTitle>
          <DialogDescription>
            Detailed information about sports providers, tournaments, teams, and their relationships
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="text-sm text-muted-foreground">Running diagnostics...</p>
            </div>
          </div>
        ) : debugData ? (
          <Tabs defaultValue="standings" className="w-full">
            <TabsList className="grid w-full grid-cols-8">
              <TabsTrigger value="standings">Standings Debug</TabsTrigger>
              <TabsTrigger value="testing">League Testing</TabsTrigger>
              <TabsTrigger value="provider-status">Provider Status</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
              <TabsTrigger value="tournaments">Tournaments</TabsTrigger>
              <TabsTrigger value="teams">Teams</TabsTrigger>
              <TabsTrigger value="relationships">Relationships</TabsTrigger>
            </TabsList>

            {/* Standings Debug Tab */}
            <TabsContent value="standings">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {/* Test Controls */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingUp className="w-5 h-5" />
                        Standings API Test
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex gap-3 items-end">
                        <div className="flex-1">
                          <label className="text-sm font-medium mb-2 block">Select League/Tournament</label>
                          <Select value={selectedLeagueForStandings} onValueChange={setSelectedLeagueForStandings}>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a league to test..." />
                            </SelectTrigger>
                            <SelectContent>
                              {debugData.tournaments?.map((tournament: any) => (
                                <SelectItem key={tournament.id} value={tournament.id}>
                                  {tournament.name} ({tournament.abbrev})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          onClick={() => selectedLeagueForStandings && testStandings(selectedLeagueForStandings)}
                          disabled={!selectedLeagueForStandings || isTestingStandings}
                          className="gap-2"
                        >
                          {isTestingStandings ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Testing...
                            </>
                          ) : (
                            <>
                              <Play className="w-4 h-4" />
                              Test API
                            </>
                          )}
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        This will call the standings endpoint and log all request/response details to help debug issues.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Test Results */}
                  {standingsLogs.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <TrendingUp className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">
                          No standings tests run yet. Select a league and click "Test API" to begin.
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium">Test Results ({standingsLogs.length})</h3>
                        <Button variant="outline" size="sm" onClick={() => setStandingsLogs([])}>
                          Clear Logs
                        </Button>
                      </div>
                      
                      {standingsLogs.map((log, idx) => (
                        <Card key={idx} className={log.response?.error ? "border-red-200 dark:border-red-800" : "border-green-200 dark:border-green-800"}>
                          <CardHeader>
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {log.response?.error ? (
                                    <XCircle className="w-5 h-5 text-red-500" />
                                  ) : (
                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                  )}
                                  {log.leagueName}
                                </CardTitle>
                                <p className="text-xs text-muted-foreground">
                                  {new Date(log.timestamp).toLocaleString()}
                                </p>
                              </div>
                              <Badge variant={log.response?.error ? "destructive" : "default"}>
                                {log.response?.status || 'N/A'}
                              </Badge>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            {/* Request Details */}
                            <div>
                              <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                <Database className="w-4 h-4" />
                                Request
                              </h4>
                              <div className="bg-muted p-3 rounded-md space-y-2 text-xs font-mono">
                                <div>
                                  <span className="text-muted-foreground">Method:</span> {log.request.method}
                                </div>
                                <div className="break-all">
                                  <span className="text-muted-foreground">URL:</span> {log.request.url}
                                </div>
                                <div>
                                  <span className="text-muted-foreground">League ID:</span> {log.leagueId}
                                </div>
                              </div>
                            </div>

                            {/* Provider Info */}
                            {log.providerInfo && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2">Provider Info</h4>
                                <div className="bg-muted p-3 rounded-md space-y-2 text-xs">
                                  {log.providerInfo.providers?.map((p: any, i: number) => (
                                    <div key={i} className="flex items-center justify-between">
                                      <span>{p.name} ({p.sport})</span>
                                      <Badge variant={p.isActive ? "default" : "secondary"} className="text-xs">
                                        {p.isActive ? "Active" : "Inactive"}
                                      </Badge>
                                    </div>
                                  ))}
                                  {(!log.providerInfo.providers || log.providerInfo.providers.length === 0) && (
                                    <p className="text-muted-foreground">No active providers found</p>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Teams Info */}
                            {log.teamsInfo && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  <Users className="w-4 h-4" />
                                  Teams Data
                                </h4>
                                <div className="bg-muted p-3 rounded-md space-y-2 text-xs">
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <span className="text-muted-foreground">Total in DB:</span>{" "}
                                      <span className="font-semibold">{log.teamsInfo.totalTeams}</span>
                                    </div>
                                    <div>
                                      <span className="text-muted-foreground">For this league:</span>{" "}
                                      <span className="font-semibold">{log.teamsInfo.teamsForThisLeague}</span>
                                    </div>
                                  </div>
                                  {log.teamsInfo.sampleTeams && log.teamsInfo.sampleTeams.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-muted-foreground mb-1">Sample teams:</p>
                                      {log.teamsInfo.sampleTeams.map((team: any, i: number) => (
                                        <div key={i} className="text-xs bg-background px-2 py-1 rounded">
                                          {team.name} ({team.abbrev})
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Response Details */}
                            {log.response && (
                              <div>
                                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                                  {log.response.error ? (
                                    <XCircle className="w-4 h-4 text-red-500" />
                                  ) : (
                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                  )}
                                  Response
                                </h4>
                                <div className={`p-3 rounded-md space-y-2 text-xs ${
                                  log.response.error 
                                    ? "bg-red-50 dark:bg-red-900/20" 
                                    : "bg-green-50 dark:bg-green-900/20"
                                }`}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-muted-foreground">Status:</span>
                                    <Badge variant={log.response.status === 200 ? "default" : "destructive"}>
                                      {log.response.status} {log.response.statusText}
                                    </Badge>
                                  </div>
                                  
                                  {log.response.error && (
                                    <div className="mt-2 p-2 bg-red-100 dark:bg-red-900/30 rounded border border-red-300 dark:border-red-700">
                                      <p className="font-semibold text-red-900 dark:text-red-100 mb-1">Error:</p>
                                      <p className="text-red-800 dark:text-red-200">{log.response.error}</p>
                                      {log.response.sportsradarError && (
                                        <details className="mt-2">
                                          <summary className="cursor-pointer text-red-700 dark:text-red-300 text-xs">
                                            Sportsradar Error Details
                                          </summary>
                                          <pre className="mt-1 p-2 bg-red-50 dark:bg-red-950/50 rounded overflow-auto text-xs">
                                            {JSON.stringify(log.response.sportsradarError, null, 2)}
                                          </pre>
                                        </details>
                                      )}
                                    </div>
                                  )}
                                  
                                  {log.response.body && (
                                    <details className="mt-2">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                        View Full Response Body
                                      </summary>
                                      <pre className="mt-2 p-2 bg-background rounded overflow-auto max-h-64 text-xs">
                                        {JSON.stringify(log.response.body, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* League Testing Tab */}
            <TabsContent value="testing">
              <SportsLeagueTestPanel />
            </TabsContent>

            {/* Provider Status Tab */}
            <TabsContent value="provider-status">
              <ScrollArea className="h-[600px]">
                <div className="space-y-6 pr-4">
                  {/* Summary */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Total Providers:</span>
                        <Badge variant="secondary">{debugData.providers?.length || 0}</Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Active Providers:</span>
                        <Badge variant="default">
                          {debugData.providers?.filter((p: any) => p.isActive).length || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Tournaments Returned:</span>
                        <Badge variant="outline">{debugData.tournaments?.length || 0}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-2">
                        Last Updated: {debugData.timestamp ? new Date(debugData.timestamp).toLocaleString() : 'N/A'}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Providers */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      All Providers
                    </h3>
                    <div className="space-y-3">
                      {debugData.providers?.map((provider: any) => (
                        <Card 
                          key={provider.id}
                          className={provider.isActive ? 'border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-700'}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <CardTitle className="text-base flex items-center gap-2">
                                  {provider.name}
                                  {provider.isActive ? (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle className="w-3 h-3" />
                                      Active
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1">
                                      <XCircle className="w-3 h-3" />
                                      Disabled
                                    </Badge>
                                  )}
                                </CardTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <Badge variant="secondary">{provider.type}</Badge>
                                  <Badge variant="outline">{provider.category}</Badge>
                                  {provider.apiKeyConfigured ? (
                                    <Badge variant="default" className="gap-1 bg-green-100 text-green-800 border-green-300">
                                      ✓ Configured
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="gap-1 bg-yellow-100 text-yellow-800 border-yellow-300">
                                      ⚠ Not Configured
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-2 text-sm">
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Provider ID:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{provider.id}</code>
                              </div>
                              <div className="flex items-center justify-between">
                                <span className="text-muted-foreground">Selected Leagues:</span>
                                <Badge>{provider.selectedLeagues?.length || 0}</Badge>
                              </div>
                              {provider.selectedLeagues && provider.selectedLeagues.length > 0 && (
                                <div className="mt-2">
                                  <span className="text-xs text-muted-foreground">League IDs:</span>
                                  <div className="mt-1 max-h-24 overflow-y-auto">
                                    {provider.selectedLeagues.map((leagueId: string, idx: number) => (
                                      <code key={idx} className="text-xs bg-muted px-2 py-1 rounded mr-1 mb-1 inline-block">
                                        {leagueId}
                                      </code>
                                    ))}
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                                <span>Updated:</span>
                                <span>{provider.updatedAt ? new Date(provider.updatedAt).toLocaleString() : 'N/A'}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                      {(!debugData.providers || debugData.providers.length === 0) && (
                        <Card>
                          <CardContent className="py-8 text-center">
                            <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                            <p className="text-sm text-muted-foreground">
                              No providers found
                            </p>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>

                  {/* Tournaments */}
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Trophy className="w-4 h-4" />
                      Current Tournaments ({debugData.tournaments?.length || 0})
                    </h3>
                    {(!debugData.tournaments || debugData.tournaments.length === 0) ? (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <AlertCircle className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No tournaments found from active providers
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            This might indicate that active providers have no selected leagues
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      <div className="space-y-2">
                        {debugData.tournaments.map((tournament: any, idx: number) => (
                          <Card key={idx}>
                            <CardContent className="py-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1">
                                  <div className="font-medium text-sm">{tournament.name}</div>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">{tournament.sport}</Badge>
                                    {tournament.season && (
                                      <Badge variant="secondary" className="text-xs">{tournament.season}</Badge>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <code className="text-xs bg-muted px-2 py-1 rounded">{tournament.id}</code>
                                  {tournament.providers && (
                                    <div className="flex items-center gap-1 mt-1">
                                      {Object.keys(tournament.providers).map((providerType: string) => (
                                        <Badge key={providerType} variant="default" className="text-xs">
                                          {providerType}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary" className="space-y-4">
              <div className="flex items-center justify-between pb-2">
                <p className="text-sm text-muted-foreground">
                  System diagnostics and maintenance tools
                </p>
                <Button
                  onClick={runCleanup}
                  disabled={isCleaningUp}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  {isCleaningUp ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Cleaning...
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      Remove Duplicates
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  {/* Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Database className="w-5 h-5 text-blue-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Providers</p>
                            <p className="text-2xl font-semibold">{debugData.providers?.length || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Trophy className="w-5 h-5 text-purple-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Tournaments</p>
                            <p className="text-2xl font-semibold">{debugData.tournaments?.length || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-3">
                          <Users className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="text-sm text-muted-foreground">Teams</p>
                            <p className="text-2xl font-semibold">{debugData.teams?.length || 0}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Issues */}
                  {debugData.issues && debugData.issues.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Issues Found</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {debugData.issues.map((issue: any, i: number) => (
                          <div key={i} className="flex items-start gap-2 p-2 rounded-md bg-muted/50">
                            {getIssueIcon(issue.type)}
                            <span className="text-sm flex-1">{issue.message}</span>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Relationship Issues */}
                  {debugData.relationships?.mismatches && debugData.relationships.mismatches.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Relationship Issues</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {debugData.relationships.mismatches.map((mismatch: any, i: number) => (
                          <div key={i} className="p-3 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                            <p className="text-sm font-medium text-red-900 dark:text-red-100">
                              {mismatch.type === 'orphan_league_id' ? '⚠️ Orphaned League ID' : 'Issue'}
                            </p>
                            <p className="text-sm text-red-700 dark:text-red-300 mt-1">{mismatch.message}</p>
                            <code className="text-xs bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded mt-2 inline-block">
                              league_id: {mismatch.leagueId}
                            </code>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}

                  {/* Teams by League */}
                  {debugData.teamsByLeague && Object.keys(debugData.teamsByLeague).length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base">Teams by League</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {Object.entries(debugData.teamsByLeague).map(([leagueId, teams]: [string, any]) => {
                          const tournament = debugData.tournaments.find((t: any) => t.id === leagueId);
                          return (
                            <div key={leagueId} className="p-3 rounded-md bg-muted/50">
                              <div className="flex items-center justify-between mb-2">
                                <span className="font-medium">
                                  {tournament ? tournament.name : `Unknown (${leagueId})`}
                                </span>
                                <Badge>{teams.length} teams</Badge>
                              </div>
                              <code className="text-xs text-muted-foreground">{leagueId}</code>
                            </div>
                          );
                        })}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {debugData.providers?.map((provider: any, i: number) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base flex items-center justify-between">
                          <span>{provider.name}</span>
                          <Badge variant={provider.isActive ? "default" : "secondary"}>
                            {provider.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">Type:</span> {provider.type}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sport:</span> {provider.sport}
                          </div>
                          <div>
                            <span className="text-muted-foreground">ID:</span> <code className="text-xs">{provider.id}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Leagues:</span> {provider.selectedLeagues?.length || 0}
                          </div>
                        </div>
                        {provider.selectedLeagues && provider.selectedLeagues.length > 0 && (
                          <div className="mt-2">
                            <p className="text-muted-foreground mb-1">Selected Leagues:</p>
                            <div className="space-y-1">
                              {provider.selectedLeagues.map((leagueId: string) => (
                                <code key={leagueId} className="block text-xs bg-muted px-2 py-1 rounded">
                                  {leagueId}
                                </code>
                              ))}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {(!debugData.providers || debugData.providers.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      No providers found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Tournaments Tab */}
            <TabsContent value="tournaments">
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {debugData.tournaments?.map((tournament: any, i: number) => (
                    <Card key={i}>
                      <CardHeader>
                        <CardTitle className="text-base">{tournament.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-muted-foreground">ID:</span> <code className="text-xs">{tournament.id}</code>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Abbrev:</span> {tournament.abbrev}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Sport:</span> {tournament.sport}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Season:</span> {tournament.season}
                          </div>
                        </div>
                        <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                          <p className="text-muted-foreground">Teams with this league_id:</p>
                          <p className="font-medium">{debugData.teamsByLeague?.[tournament.id]?.length || 0} teams</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {(!debugData.tournaments || debugData.tournaments.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      No tournaments found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Teams Tab */}
            <TabsContent value="teams">
              <div className="mb-4 flex items-center justify-between bg-muted/50 p-4 rounded-lg">
                <div>
                  <h3 className="font-medium">Team Branding</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Refresh team colors and logos from Sportsradar API
                  </p>
                </div>
                <Button
                  onClick={() => refreshBranding()}
                  disabled={isRefreshingBranding}
                  variant="outline"
                  className="gap-2"
                >
                  {isRefreshingBranding ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Refreshing...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4" />
                      Refresh All Team Colors
                    </>
                  )}
                </Button>
              </div>
              <ScrollArea className="h-[500px]">
                <div className="space-y-3 pr-4">
                  {debugData.teams?.slice(0, 50).map((team: any, i: number) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <p className="font-medium">{team.name}</p>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <div><span className="font-medium">ID:</span> <code className="text-xs">{team.id}</code></div>
                              <div><span className="font-medium">League ID:</span> <code className="text-xs">{team.league_id}</code></div>
                              {team.abbrev && <div><span className="font-medium">Abbrev:</span> {team.abbrev}</div>}
                              {team.city && <div><span className="font-medium">City:</span> {team.city}</div>}
                            </div>
                          </div>
                          {team.brand?.primary_color && (
                            <div 
                              className="w-8 h-8 rounded"
                              style={{ backgroundColor: team.brand.primary_color }}
                            />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {debugData.teams && debugData.teams.length > 50 && (
                    <div className="text-center text-sm text-muted-foreground">
                      Showing 50 of {debugData.teams.length} teams
                    </div>
                  )}
                  {(!debugData.teams || debugData.teams.length === 0) && (
                    <div className="text-center py-12 text-muted-foreground">
                      No teams found
                    </div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Relationships Tab */}
            <TabsContent value="relationships">
              <ScrollArea className="h-[500px]">
                <div className="space-y-4 pr-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Tournament IDs</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {debugData.relationships?.tournamentIds?.map((id: string) => (
                        <code key={id} className="block text-xs bg-muted px-2 py-1 rounded">
                          {id}
                        </code>
                      ))}
                      {(!debugData.relationships?.tournamentIds || debugData.relationships.tournamentIds.length === 0) && (
                        <p className="text-sm text-muted-foreground">No tournament IDs</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Team League IDs (Unique)</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {debugData.relationships?.teamLeagueIds?.map((id: string) => {
                        const hasMatch = debugData.relationships?.tournamentIds?.includes(id);
                        return (
                          <div key={id} className="flex items-center justify-between">
                            <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                              {id}
                            </code>
                            {hasMatch ? (
                              <CheckCircle2 className="w-4 h-4 text-green-500 ml-2" />
                            ) : (
                              <XCircle className="w-4 h-4 text-red-500 ml-2" />
                            )}
                          </div>
                        );
                      })}
                      {(!debugData.relationships?.teamLeagueIds || debugData.relationships.teamLeagueIds.length === 0) && (
                        <p className="text-sm text-muted-foreground">No team league IDs</p>
                      )}
                    </CardContent>
                  </Card>

                  {debugData.relationships?.mismatches && debugData.relationships.mismatches.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-base text-red-600 dark:text-red-400">
                          Mismatches Found
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {debugData.relationships.mismatches.map((mismatch: any, i: number) => (
                          <div key={i} className="p-3 rounded-md bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                            <code className="text-xs">{mismatch.leagueId}</code>
                            <p className="text-sm mt-1">{mismatch.message}</p>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            Click the Debug button to run diagnostics
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
