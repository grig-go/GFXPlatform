import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { Alert, AlertDescription } from "./ui/alert";
import { Database, Activity, RefreshCw, CheckCircle2, XCircle, Loader2, Trophy, Plus, Info } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";

interface Competition {
  id: string;
  name: string;
  category: string;
  country: string;
  gender: string;
  type: string;
}

interface SportsProvider {
  id: string;
  name: string;
  type: string;
  sport: string;
  apiKey: string;
  apiSecret: string | null;
  baseUrl: string;
  selectedLeagues: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastSyncedAt?: string;
}

interface SportsradarConfigCardProps {
  onDataSync?: () => void;
}

const SPORTS = [
  { value: "soccer", label: "Soccer" },
  { value: "basketball", label: "Basketball" },
  { value: "american-football", label: "American Football" },
  { value: "baseball", label: "Baseball" },
  { value: "ice-hockey", label: "Ice Hockey" },
  { value: "tennis", label: "Tennis" },
];

export function SportsradarConfigCard({ onDataSync }: SportsradarConfigCardProps) {
  const [providers, setProviders] = useState<SportsProvider[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isTesting, setIsTesting] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  
  // New provider form
  const [newProviderName, setNewProviderName] = useState("");
  const [newProviderType, setNewProviderType] = useState("sportsradar");
  const [newProviderSport, setNewProviderSport] = useState("soccer");
  const [newProviderApiKey, setNewProviderApiKey] = useState("");
  const [newProviderAccess, setNewProviderAccess] = useState("trial");
  const [newProviderVersion, setNewProviderVersion] = useState("v4");
  const [newProviderLocale, setNewProviderLocale] = useState("en");

  useEffect(() => {
    loadProviders();
  }, []);

  const loadProviders = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-providers'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Ensure data is always an array
        const providersList = Array.isArray(data) ? data : (data?.providers || []);
        setProviders(providersList);
      }
    } catch (error) {
      console.error("Error loading sports providers:", error);
      toast.error("Failed to load sports providers");
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async (providerId: string) => {
    try {
      setIsTesting(providerId);
      const response = await fetch(
        getEdgeFunctionUrl(`sports_dashboard/sports-providers/${providerId}/test`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(`✓ Connected to ${data.testData.provider} - ${data.testData.competitionsAvailable} competitions available`);
      } else {
        toast.error(`Connection failed: ${data.error}`);
      }
    } catch (error) {
      console.error("Error testing connection:", error);
      toast.error("Connection test failed");
    } finally {
      setIsTesting(null);
    }
  };



  const syncData = async (providerId: string) => {
    try {
      setIsSyncing(providerId);
      const provider = providers.find(p => p.id === providerId);
      
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-data/sync'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sport: provider?.sport,
            providerId,
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        toast.success(`Synced ${data.results.teams} teams, ${data.results.games} games, ${data.results.tournaments} tournaments`);
        if (onDataSync) onDataSync();
      } else {
        const error = await response.json();
        toast.error(`Sync failed: ${error.error}`);
      }
    } catch (error) {
      console.error("Error syncing data:", error);
      toast.error("Failed to sync data");
    } finally {
      setIsSyncing(null);
    }
  };

  const addProvider = async () => {
    try {
      if (!newProviderName || !newProviderApiKey) {
        toast.error("Name and API key are required");
        return;
      }

      // Determine baseUrl based on provider type
      let baseUrl: string;
      if (newProviderType === "sportmonks") {
        // SportMonks uses v3 API with sport-specific endpoints
        baseUrl = `https://api.sportmonks.com/v3/football`;
      } else {
        // Sportsradar uses access/version/locale pattern
        baseUrl = `https://api.sportradar.com/${newProviderSport}/${newProviderAccess}/${newProviderVersion}/${newProviderLocale}`;
      }
      
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports-providers'),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: `${newProviderType}_${newProviderSport}_${Date.now()}`,
            name: newProviderName,
            type: newProviderType,
            sport: newProviderSport,
            apiKey: newProviderApiKey,
            baseUrl: baseUrl,
            selectedLeagues: [],
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }),
        }
      );

      if (response.ok) {
        toast.success("Provider added successfully");
        setShowAddDialog(false);
        setNewProviderName("");
        setNewProviderType("sportsradar");
        setNewProviderApiKey("");
        setNewProviderSport("soccer");
        loadProviders();
      } else {
        const error = await response.json();
        toast.error(`Failed to add provider: ${error.error}`);
      }
    } catch (error) {
      console.error("Error adding provider:", error);
      toast.error("Failed to add provider");
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" />
          <h3 className="text-lg font-medium">Sports Data Providers</h3>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Provider
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Sports Provider</DialogTitle>
              <DialogDescription>
                Add a new sports data provider (Sportsradar or SportMonks). Each sport requires its own API key.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="provider-type">Provider Type</Label>
                <Select value={newProviderType} onValueChange={setNewProviderType}>
                  <SelectTrigger id="provider-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sportsradar">Sportsradar</SelectItem>
                    <SelectItem value="sportmonks">SportMonks</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="provider-name">Provider Name</Label>
                <Input
                  id="provider-name"
                  placeholder={newProviderType === "sportmonks" ? "e.g., SportMonks Football" : "e.g., Sportsradar Basketball"}
                  value={newProviderName}
                  onChange={(e) => setNewProviderName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sport">Sport</Label>
                <Select value={newProviderSport} onValueChange={setNewProviderSport}>
                  <SelectTrigger id="sport">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPORTS.map((sport) => (
                      <SelectItem key={sport.value} value={sport.value}>
                        {sport.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="api-key">API Key</Label>
                <Input
                  id="api-key"
                  type="password"
                  placeholder={newProviderType === "sportmonks" ? "Your SportMonks API token" : "Your Sportsradar API key"}
                  value={newProviderApiKey}
                  onChange={(e) => setNewProviderApiKey(e.target.value)}
                />
              </div>
              
              {newProviderType === "sportsradar" && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="access">Access Level</Label>
                      <Select value={newProviderAccess} onValueChange={setNewProviderAccess}>
                        <SelectTrigger id="access">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trial">Trial</SelectItem>
                          <SelectItem value="production">Production</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="version">API Version</Label>
                      <Select value={newProviderVersion} onValueChange={setNewProviderVersion}>
                        <SelectTrigger id="version">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="v3">v3</SelectItem>
                          <SelectItem value="v4">v4</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="locale">Locale</Label>
                      <Select value={newProviderLocale} onValueChange={setNewProviderLocale}>
                        <SelectTrigger id="locale">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="en">English (en)</SelectItem>
                          <SelectItem value="de">German (de)</SelectItem>
                          <SelectItem value="es">Spanish (es)</SelectItem>
                          <SelectItem value="fr">French (fr)</SelectItem>
                          <SelectItem value="it">Italian (it)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Alert>
                    <Info className="w-4 h-4" />
                    <AlertDescription className="text-xs">
                      Base URL will be: <code className="text-xs bg-muted px-1 rounded">
                        https://api.sportradar.com/{newProviderSport}/{newProviderAccess}/{newProviderVersion}/{newProviderLocale}
                      </code>
                    </AlertDescription>
                  </Alert>
                </>
              )}
              
              {newProviderType === "sportmonks" && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription className="text-xs">
                    Base URL will be: <code className="text-xs bg-muted px-1 rounded">
                      https://api.sportmonks.com/v3/football
                    </code>
                  </AlertDescription>
                </Alert>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancel
              </Button>
              <Button onClick={addProvider}>Add Provider</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {providers.length > 0 && (
        <Alert>
          <Info className="w-4 h-4" />
          <AlertDescription>
            Auto-sync runs every 10 minutes with a 5-minute rate limit per provider. Manual syncs respect the same limits to prevent API rate limiting errors.
          </AlertDescription>
        </Alert>
      )}

      {providers.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-muted-foreground">
            No sports providers configured. Click "Add Provider" to get started.
          </CardContent>
        </Card>
      ) : (
        providers.map((provider) => (
          <Card key={provider.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" />
                    {provider.name}
                    <Badge variant={provider.isActive ? "default" : "outline"}>
                      {provider.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </CardTitle>
                  <CardDescription>
                    {provider.type} • {provider.sport} • {provider.selectedLeagues?.length || 0} league(s) selected
                    {provider.lastSyncedAt && (
                      <span className="block text-xs mt-1">
                        Last synced: {new Date(provider.lastSyncedAt).toLocaleString()}
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => testConnection(provider.id)}
                    disabled={isTesting === provider.id}
                    title="Test Connection"
                  >
                    {isTesting === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Activity className="w-4 h-4" />
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => syncData(provider.id)}
                    disabled={isSyncing === provider.id || provider.selectedLeagues?.length === 0}
                  >
                    {isSyncing === provider.id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <RefreshCw className="w-4 h-4 mr-2" />
                    )}
                    Sync Data
                  </Button>
                </div>
              </div>
            </CardHeader>
          </Card>
        ))
      )}
    </div>
  );
}