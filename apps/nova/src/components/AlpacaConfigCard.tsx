import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Database, RefreshCw, CheckCircle, XCircle, Loader2, Clock, Rss } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface AlpacaConfig {
  provider: string;
  apiKeyConfigured: boolean;
  tier: string;
  refreshInterval: number;
  lastRefresh: string | null;
  stockCount: number;
  usingRealData?: boolean;
}

export function AlpacaConfigCard() {
  const [config, setConfig] = useState<AlpacaConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState<number>(300000); // 5 minutes in ms
  const [isSaving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks/config'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to load configuration');
      }

      const data = await response.json();
      setConfig(data);
      setRefreshInterval(data.refreshInterval);
    } catch (error) {
      console.error('Error loading Alpaca config:', error);
      toast.error('Failed to load Alpaca configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks/config'),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({ refreshInterval }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save configuration');
      }

      toast.success('Configuration updated successfully');
      await loadConfig();
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const formatInterval = (ms: number) => {
    const minutes = ms / 60000;
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    }
    const hours = minutes / 60;
    return `${hours} hour${hours !== 1 ? 's' : ''}`;
  };

  const formatLastRefresh = (timestamp: string | null) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Alpaca Markets API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!config) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Alpaca Markets API
        </CardTitle>
        <CardDescription>
          {config.usingRealData 
            ? "Real-time stock market data (Paper Trading API)" 
            : "Stock market data configuration"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">API Status</Label>
            <div className="flex items-center gap-2 mt-1">
              {config.apiKeyConfigured ? (
                <>
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm">Connected</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <span className="text-sm">Not configured</span>
                </>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Data Source</Label>
            <div className="mt-1">
              <Badge variant={config.usingRealData ? "default" : "secondary"}>
                {config.usingRealData ? "Real Market Data" : "Mock Data"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div>
            <Label className="text-xs text-muted-foreground">Tracked Stocks</Label>
            <p className="text-2xl font-semibold mt-1">{config.stockCount}</p>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Last Refresh
            </Label>
            <p className="text-sm mt-1">{formatLastRefresh(config.lastRefresh)}</p>
          </div>
        </div>

        {/* Refresh Interval */}
        <div className="space-y-2 pt-2 border-t">
          <Label htmlFor="refreshInterval">Refresh Interval</Label>
          <div className="flex gap-2">
            <Input
              id="refreshInterval"
              type="number"
              value={refreshInterval / 60000}
              onChange={(e) => setRefreshInterval(Number(e.target.value) * 60000)}
              min={1}
              step={1}
              className="flex-1"
            />
            <div className="flex items-center text-sm text-muted-foreground whitespace-nowrap">
              minutes
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Current: {formatInterval(config.refreshInterval)}
            {refreshInterval !== config.refreshInterval && (
              <span className="text-amber-600"> (unsaved changes)</span>
            )}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={saveConfig}
            disabled={isSaving || refreshInterval === config.refreshInterval}
            size="sm"
            className="flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Configuration'
            )}
          </Button>
        </div>

        {/* Info */}
        <div className="text-xs text-muted-foreground pt-2 border-t space-y-2">
          <p>
            Stock prices automatically refresh every {formatInterval(config.refreshInterval)}.
            You can manually refresh from the Finance Dashboard.
          </p>
          {config.usingRealData && (
            <div className="space-y-1">
              <p className="text-green-600 dark:text-green-400 flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Using real-time data from Alpaca Markets (Paper Trading API)
              </p>
              <p className="text-blue-600 dark:text-blue-400">
                📊 This feed is also available in the Data Feeds page under Finance category
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}