import { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "./ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { ScrollArea } from "./ui/scroll-area";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Bug, Database, Newspaper, AlertCircle, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

export function NewsDebugPanel() {
  const [isOpen, setIsOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const runDiagnostics = async () => {
    setIsLoading(true);
    try {
      console.log('=== NEWS DEBUG DIAGNOSTICS ===');
      
      const diagnostics: any = {
        timestamp: new Date().toISOString(),
        edgeFunctionHealth: null,
        providers: [],
        issues: []
      };

      // Test edge function health first
      console.log('[Debug] Testing news_dashboard edge function health...');
      try {
        const healthResponse = await fetch(
          getEdgeFunctionUrl('news_dashboard/health'),
          {
            headers: {
              Authorization: `Bearer ${getSupabaseAnonKey()}`,
            },
          }
        );

        if (healthResponse.ok) {
          const healthData = await healthResponse.json();
          diagnostics.edgeFunctionHealth = {
            status: 'ok',
            data: healthData
          };
          console.log('[Debug] ✅ Edge function is healthy:', healthData);
        } else {
          diagnostics.edgeFunctionHealth = {
            status: 'error',
            statusCode: healthResponse.status,
            statusText: healthResponse.statusText
          };
          console.error('[Debug] ❌ Edge function health check failed:', healthResponse.status);
          diagnostics.issues.push({
            type: 'error',
            message: `Edge function health check failed: ${healthResponse.status} ${healthResponse.statusText}`
          });
        }
      } catch (error) {
        diagnostics.edgeFunctionHealth = {
          status: 'error',
          error: String(error)
        };
        console.error('[Debug] ❌ Edge function unreachable:', error);
        diagnostics.issues.push({
          type: 'error',
          message: `Edge function unreachable: ${error instanceof Error ? error.message : String(error)}`
        });
      }

      // Fetch News Providers using RPC pattern (same as Finance/Sports/Weather)
      console.log('[Debug] Fetching news providers from data_providers table...');
      
      try {
        // Step 1: Get provider list from public view (IDs only, credentials masked)
        const listResponse = await fetch(
          getRestUrl('data_providers_public?select=id,name,type,category,is_active&category=eq.news'),
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
        console.log(`[Debug] Found ${providerList.length} news providers in database`);
        
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

      // Check for empty providers
      diagnostics.providers.forEach((provider: any) => {
        if (!provider.isActive) {
          diagnostics.issues.push({
            type: 'info',
            message: `Provider "${provider.name}" is not active`
          });
        }
        
        if (!provider.apiKeyConfigured) {
          diagnostics.issues.push({
            type: 'warning',
            message: `Provider "${provider.name}" has no API key configured`
          });
        }
      });

      // Check for empty data
      if (diagnostics.providers.length === 0) {
        diagnostics.issues.push({
          type: 'error',
          message: 'No news providers found. Please configure providers in Data Feeds.'
        });
      }

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

  const getIssueIcon = (type: string) => {
    switch (type) {
      case 'error': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <CheckCircle2 className="w-4 h-4 text-blue-500" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'newsapi': return '🗞️';
      case 'newsdata': return '📰';
      default: return '📄';
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
            News Data Diagnostics
          </DialogTitle>
          <DialogDescription>
            Detailed information about news providers, configurations, and their status
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
          <Tabs defaultValue="provider-status" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="provider-status">Provider Status</TabsTrigger>
              <TabsTrigger value="summary">Summary</TabsTrigger>
              <TabsTrigger value="providers">Providers</TabsTrigger>
            </TabsList>

            {/* Provider Status Tab */}
            <TabsContent value="provider-status">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Total Providers:</span>
                        <Badge variant="secondary">{debugData.providers?.length || 0}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Active Providers:</span>
                        <Badge variant="secondary">
                          {debugData.providers?.filter((p: any) => p.isActive).length || 0}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Last Updated:</span>
                        <span className="text-sm">{new Date(debugData.timestamp).toLocaleString()}</span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* All Providers Section */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4" />
                      <h3 className="font-medium">All Providers</h3>
                    </div>
                    
                    {debugData.providers?.length === 0 ? (
                      <Card>
                        <CardContent className="p-8 text-center">
                          <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                          <p className="text-muted-foreground">No news providers configured</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            Configure providers in Data Feeds → News category
                          </p>
                        </CardContent>
                      </Card>
                    ) : (
                      debugData.providers?.map((provider: any) => (
                        <Card key={provider.id} className="border-l-4" style={{
                          borderLeftColor: provider.isActive && provider.configured ? '#22c55e' : '#ef4444'
                        }}>
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-3">
                                <div className="text-2xl">{getProviderIcon(provider.type)}</div>
                                <div>
                                  <CardTitle className="text-base">{provider.name}</CardTitle>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Badge variant="outline" className="text-xs">
                                      {provider.type}
                                    </Badge>
                                    {provider.isActive ? (
                                      <Badge className="bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300 text-xs">
                                        ✓ Active
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="text-xs">
                                        ✗ Disabled
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Provider Details */}
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Provider ID:</span>
                                <code className="text-xs bg-muted px-2 py-1 rounded">{provider.id}</code>
                              </div>
                              
                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">API Key:</span>
                                <div className="flex items-center gap-2">
                                  {provider.apiKeyConfigured ? (
                                    <>
                                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                                      <span className="text-green-600 dark:text-green-400">✓ Configured</span>
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-4 h-4 text-red-500" />
                                      <span className="text-red-600 dark:text-red-400">✗ Not Set</span>
                                    </>
                                  )}
                                </div>
                              </div>

                              {provider.baseUrl && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">Base URL:</span>
                                  <code className="text-xs bg-muted px-2 py-1 rounded max-w-[300px] truncate">
                                    {provider.baseUrl}
                                  </code>
                                </div>
                              )}

                              {provider.apiVersion && (
                                <div className="flex justify-between text-sm">
                                  <span className="text-muted-foreground">API Version:</span>
                                  <span className="text-xs">{provider.apiVersion}</span>
                                </div>
                              )}

                              <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Updated:</span>
                                <span className="text-xs">{new Date(provider.updatedAt).toLocaleString()}</span>
                              </div>
                            </div>

                            {/* Configuration */}
                            {provider.config && Object.keys(provider.config).length > 0 && (
                              <div className="mt-3 pt-3 border-t">
                                <p className="text-sm text-muted-foreground mb-2">Configuration:</p>
                                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                  {JSON.stringify(provider.config, null, 2)}
                                </pre>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Summary Tab */}
            <TabsContent value="summary">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Total Providers:</p>
                          <p className="text-2xl">{debugData.providers?.length || 0}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground mb-1">Active Providers:</p>
                          <p className="text-2xl text-green-600 dark:text-green-400">
                            {debugData.providers?.filter((p: any) => p.isActive).length || 0}
                          </p>
                        </div>
                      </div>
                      
                      <div className="pt-3 border-t">
                        <p className="text-sm text-muted-foreground mb-1">Last Updated:</p>
                        <p className="text-sm">{new Date(debugData.timestamp).toLocaleString()}</p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Issues */}
                  {debugData.issues?.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <AlertCircle className="w-5 h-5" />
                          Issues ({debugData.issues.length})
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {debugData.issues.map((issue: any, idx: number) => (
                            <div key={idx} className="flex items-start gap-2 p-3 rounded-lg bg-muted">
                              {getIssueIcon(issue.type)}
                              <div className="flex-1">
                                <p className="text-sm">{issue.message}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* Providers Tab */}
            <TabsContent value="providers">
              <ScrollArea className="h-[600px]">
                <div className="space-y-4 pr-4">
                  {debugData.providers?.length === 0 ? (
                    <Card>
                      <CardContent className="p-12 text-center">
                        <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                        <p className="text-muted-foreground">No providers found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    debugData.providers?.map((provider: any) => (
                      <Card key={provider.id}>
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <span className="text-2xl">{getProviderIcon(provider.type)}</span>
                            {provider.name}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                            {JSON.stringify(provider, null, 2)}
                          </pre>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Click "Debug" to run diagnostics</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}