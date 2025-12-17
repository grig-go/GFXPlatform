import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AlertCircle, CheckCircle, RefreshCw, XCircle } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

interface DebugInfo {
  configured: boolean;
  apiKeySet: boolean;
  apiSecretSet: boolean;
  apiKeyPrefix: string;
  apiSecretPrefix: string;
  baseUrl: string;
  brokerUrl: string;
  expectedKeyPrefix: string;
  expectedSecretPrefix: string;
}

export function AlpacaDebugPanel() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDebugInfo = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks/debug'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setDebugInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch debug info");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  const isKeyCorrect = debugInfo?.apiKeyPrefix === debugInfo?.expectedKeyPrefix;
  const isSecretCorrect = debugInfo?.apiSecretPrefix === debugInfo?.expectedSecretPrefix;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5 text-amber-600" />
          Alpaca API Debug Panel
        </CardTitle>
        <CardDescription>
          Verify API key configuration
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2">
          <Button
            onClick={fetchDebugInfo}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">
              <strong>Error:</strong> {error}
            </p>
          </div>
        )}

        {debugInfo && (
          <div className="space-y-3">
            {/* Overall Status */}
            <div className="p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm">Overall Configuration</span>
                {debugInfo.configured ? (
                  <Badge variant="default" className="bg-green-600">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Configured
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <XCircle className="w-3 h-3 mr-1" />
                    Not Configured
                  </Badge>
                )}
              </div>
            </div>

            {/* API Key Status */}
            <div className="p-3 border rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Key</span>
                  {debugInfo.apiKeySet ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Set
                    </Badge>
                  )}
                </div>
                
                {debugInfo.apiKeySet && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {debugInfo.apiKeyPrefix}...
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected:</span>
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {debugInfo.expectedKeyPrefix}...
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Match:</span>
                      {isKeyCorrect ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Correct
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Incorrect
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* API Secret Status */}
            <div className="p-3 border rounded-lg">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">API Secret</span>
                  {debugInfo.apiSecretSet ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Set
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <XCircle className="w-3 h-3 mr-1" />
                      Not Set
                    </Badge>
                  )}
                </div>
                
                {debugInfo.apiSecretSet && (
                  <div className="text-xs space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current:</span>
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {debugInfo.apiSecretPrefix}...
                      </code>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected:</span>
                      <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">
                        {debugInfo.expectedSecretPrefix}...
                      </code>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Match:</span>
                      {isSecretCorrect ? (
                        <Badge variant="default" className="bg-green-600 text-xs">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Correct
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          <XCircle className="w-3 h-3 mr-1" />
                          Incorrect
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Endpoints */}
            <div className="p-3 border rounded-lg">
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Base URL:</span>
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                    {debugInfo.baseUrl}
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Broker URL:</span>
                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded text-xs">
                    {debugInfo.brokerUrl}
                  </code>
                </div>
              </div>
            </div>

            {/* Instructions */}
            {(!isKeyCorrect || !isSecretCorrect) && (
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-sm text-amber-900 dark:text-amber-100 mb-2">
                  <strong>Action Required:</strong>
                </p>
                <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc list-inside">
                  {!isKeyCorrect && (
                    <li>Update ALPACA_API_KEY to: <code className="bg-white dark:bg-gray-800 px-1 rounded">PKOSFDGF5FUEN3AUWIIZ6B3TVB</code></li>
                  )}
                  {!isSecretCorrect && (
                    <li>Update ALPACA_API_SECRET to: <code className="bg-white dark:bg-gray-800 px-1 rounded">UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjW...</code></li>
                  )}
                  <li>After updating, the server will automatically reload</li>
                  <li>Click "Refresh" above to verify the changes</li>
                </ul>
              </div>
            )}

            {isKeyCorrect && isSecretCorrect && (
              <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <p className="text-sm text-green-700 dark:text-green-300 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  <strong>API keys are correctly configured!</strong>
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                  You should now be able to search for and fetch real stock data.
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}