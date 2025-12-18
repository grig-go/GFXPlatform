import { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, Loader2, Activity, Database, AlertCircle } from 'lucide-react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from '../utils/supabase/config';

interface DataProvider {
  id: string;
  name: string;
  type: string;
  category: string;
  status: string;
  configured: boolean;
  apiKeyConfigured: boolean;
}

interface HealthCheckResult {
  status: 'ok' | 'error' | 'checking' | null;
  providers: DataProvider[];
  error?: string;
  timestamp?: string;
}

export function BackendHealthCheck() {
  const [result, setResult] = useState<HealthCheckResult>({ status: null, providers: [] });
  
  useEffect(() => {
    runHealthCheck();
  }, []);
  
  const runHealthCheck = async () => {
    setResult({ status: 'checking', providers: [] });
    
    try {
      // Fetch providers using secure RPC pattern (same as Finance Dashboard)
      const listResponse = await fetch(
        `${getRestUrl('data_providers_public')}?select=id,name,type,category,is_active`,
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
      
      // Fetch full details for each provider using secure RPC function
      const providersWithDetails: DataProvider[] = [];
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
              configured: p.api_key ? true : false,
              apiKeyConfigured: p.api_key ? true : false,
            });
          }
        }
      }
      
      setResult({
        status: 'ok',
        providers: providersWithDetails,
        timestamp: new Date().toLocaleTimeString(),
      });
    } catch (error) {
      setResult({
        status: 'error',
        providers: [],
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };
  
  const getStatusBadge = (provider: DataProvider) => {
    if (provider.status === 'active' && provider.configured) {
      return <Badge className="bg-green-100 text-green-800 border-green-300">✓ Active</Badge>;
    } else if (provider.status === 'active' && !provider.configured) {
      return <Badge variant="outline" className="bg-yellow-100 text-yellow-800 border-yellow-300">⚠ Not Configured</Badge>;
    } else {
      return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-300">Inactive</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Backend Health Check
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {result.status === 'ok' && (
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5" />
              <div className="flex-1 space-y-1">
                <div className="text-green-900 dark:text-green-100">
                  ✅ Backend is healthy
                </div>
                <div className="text-xs text-green-700 dark:text-green-300">
                  Found {result.providers.length} data provider{result.providers.length !== 1 ? 's' : ''}
                </div>
                {result.timestamp && (
                  <div className="text-xs text-green-600 dark:text-green-400">
                    Checked at: {result.timestamp}
                  </div>
                )}
              </div>
            </div>
            
            {result.providers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Database className="w-4 h-4" />
                  <span>Data Providers</span>
                </div>
                <div className="space-y-2">
                  {result.providers.map((provider) => (
                    <div key={provider.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-900 rounded border border-gray-200 dark:border-gray-800">
                      <div className="flex-1">
                        <div className="text-sm">{provider.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {provider.category} • {provider.type}
                        </div>
                      </div>
                      {getStatusBadge(provider)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {result.status === 'error' && (
          <div className="flex items-start gap-3 p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg">
            <XCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="text-red-900 dark:text-red-100">
                ❌ Backend connection failed
              </div>
              {result.error && (
                <div className="text-xs text-red-700 dark:text-red-300 font-mono">
                  {result.error}
                </div>
              )}
              {result.timestamp && (
                <div className="text-xs text-red-600 dark:text-red-400">
                  Checked at: {result.timestamp}
                </div>
              )}
            </div>
          </div>
        )}
        
        <Button 
          onClick={runHealthCheck}
          disabled={result.status === 'checking'}
          className="w-full"
        >
          {result.status === 'checking' ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Checking...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4 mr-2" />
              Test Backend Connection
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
