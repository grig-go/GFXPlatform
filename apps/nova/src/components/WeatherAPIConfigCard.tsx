import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Cloud, CheckCircle, XCircle, Loader2, Eye, EyeOff, Zap, ExternalLink } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface WeatherProvider {
  id: string;
  name: string;
  type: string;
  apiKey: string;
  baseUrl: string;
  isActive: boolean;
  language?: string;
  temperatureUnit?: string;
  createdAt: string;
  updatedAt: string;
}

// WeatherAPI.com supported languages
const WEATHER_API_LANGUAGES = [
  { code: "en", name: "English" },
  { code: "ar", name: "Arabic" },
  { code: "bn", name: "Bengali" },
  { code: "bg", name: "Bulgarian" },
  { code: "zh", name: "Chinese Simplified" },
  { code: "zh_tw", name: "Chinese Traditional" },
  { code: "cs", name: "Czech" },
  { code: "da", name: "Danish" },
  { code: "nl", name: "Dutch" },
  { code: "fi", name: "Finnish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
  { code: "el", name: "Greek" },
  { code: "hi", name: "Hindi" },
  { code: "hu", name: "Hungarian" },
  { code: "it", name: "Italian" },
  { code: "ja", name: "Japanese" },
  { code: "jv", name: "Javanese" },
  { code: "ko", name: "Korean" },
  { code: "zh_cmn", name: "Mandarin" },
  { code: "mr", name: "Marathi" },
  { code: "pl", name: "Polish" },
  { code: "pt", name: "Portuguese" },
  { code: "pa", name: "Punjabi" },
  { code: "ro", name: "Romanian" },
  { code: "ru", name: "Russian" },
  { code: "sr", name: "Serbian" },
  { code: "si", name: "Sinhalese" },
  { code: "sk", name: "Slovak" },
  { code: "es", name: "Spanish" },
  { code: "sv", name: "Swedish" },
  { code: "ta", name: "Tamil" },
  { code: "te", name: "Telugu" },
  { code: "tr", name: "Turkish" },
  { code: "uk", name: "Ukrainian" },
  { code: "ur", name: "Urdu" },
  { code: "vi", name: "Vietnamese" },
  { code: "zh_wuu", name: "Wu (Shanghainese)" },
  { code: "zh_hsn", name: "Xiang (Hunanese)" },
  { code: "zh_yue", name: "Yue (Cantonese)" },
  { code: "zu", name: "Zulu" },
];

export function WeatherAPIConfigCard() {
  const [provider, setProvider] = useState<WeatherProvider | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [language, setLanguage] = useState("en");
  const [temperatureUnit, setTemperatureUnit] = useState("f");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadProvider();
  }, []);

  const loadProvider = async () => {
    try {
      setLoading(true);
      console.log("Loading weather provider using RPC...");
      
      // First, get list of weather providers using RPC
      const listUrl = getRestUrl('rpc/list_providers_with_status_category');
      const listResponse = await fetch(listUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
          apikey: getSupabaseAnonKey(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ p_category: 'weather' }),
      });

      if (!listResponse.ok) {
        throw new Error("Failed to load weather provider list");
      }

      const providers = await listResponse.json();
      console.log("Weather providers from RPC:", providers);
      
      if (providers && providers.length > 0) {
        const firstProvider = providers[0];
        
        // Fetch full details including API key using get_provider_details RPC
        const detailsUrl = getRestUrl('rpc/get_provider_details');
        const detailsResponse = await fetch(detailsUrl, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ p_id: firstProvider.id }),
        });
        
        if (detailsResponse.ok) {
          const detailsData = await detailsResponse.json();
          console.log("Provider details from RPC:", detailsData);
          
          if (detailsData && detailsData.length > 0) {
            const providerDetails = detailsData[0];
            const config = providerDetails.config || {};
            
            setProvider({
              id: providerDetails.id,
              name: providerDetails.name,
              type: providerDetails.type,
              apiKey: providerDetails.api_key || '',
              baseUrl: providerDetails.base_url || 'https://api.weatherapi.com/v1',
              isActive: providerDetails.is_active,
              language: config.language || 'en',
              temperatureUnit: config.temperatureUnit || 'f',
              createdAt: providerDetails.created_at,
              updatedAt: providerDetails.updated_at,
            });
            setApiKey(providerDetails.api_key || '');
            setLanguage(config.language || 'en');
            setTemperatureUnit(config.temperatureUnit || 'f');
          }
        } else {
          // Fallback: use basic info from list
          setProvider({
            id: firstProvider.id,
            name: firstProvider.name,
            type: firstProvider.type,
            apiKey: '',
            baseUrl: 'https://api.weatherapi.com/v1',
            isActive: firstProvider.is_active,
            language: 'en',
            temperatureUnit: 'f',
            createdAt: '',
            updatedAt: '',
          });
        }
      }
    } catch (error) {
      console.error("Error loading weather provider:", error);
      toast.error("Failed to load weather provider");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!apiKey.trim()) {
      toast.error("Please enter an API key");
      return;
    }

    try {
      setSaving(true);
      
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/providers'),
        {
          method: provider ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({
            id: provider?.id || "weatherapi-default",
            name: "WeatherAPI.com",
            type: "weatherapi",
            apiKey: apiKey.trim(),
            baseUrl: "https://api.weatherapi.com/v1",
            language: language,
            temperatureUnit: temperatureUnit,
            isActive: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save provider");
      }

      const data = await response.json();
      setProvider(data.provider);
      setIsEditing(false);
      toast.success("Weather provider saved successfully");
      
      // Reload to get updated status
      await loadProvider();
    } catch (error: any) {
      console.error("Error saving weather provider:", error);
      toast.error(error.message || "Failed to save weather provider");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!provider) {
      toast.error("No provider configured");
      return;
    }

    try {
      setTesting(true);
      
      // Test with a simple query for New York
      const response = await fetch(
        getEdgeFunctionUrl('weather_dashboard/locations/search?q=New York'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Connection test failed");
      }

      const data = await response.json();
      if (data.results && data.results.length > 0) {
        toast.success("Connection test successful!", {
          description: `Found ${data.results.length} locations`,
        });
      } else {
        toast.warning("Connection successful but no results");
      }
    } catch (error: any) {
      console.error("Error testing weather provider:", error);
      toast.error("Connection test failed", {
        description: error.message,
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={provider?.isActive ? "border-blue-500" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
              <Cloud className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <CardTitle className="flex items-center gap-2">
                WeatherAPI.com
                {provider?.isActive && (
                  <Badge className="bg-blue-600">Active</Badge>
                )}
              </CardTitle>
              <CardDescription>
                Real-time weather data and forecasts
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open("https://www.weatherapi.com/docs/", "_blank")}
              className="gap-2"
            >
              <ExternalLink className="w-4 h-4" />
              API Docs
            </Button>
            {provider && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleTest}
                disabled={testing}
                className="gap-2"
              >
                {testing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    Test Connection
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!provider || isEditing ? (
          <>
            <div className="space-y-2">
              <Label htmlFor="api-key">API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="api-key"
                    type={showApiKey ? "text" : "password"}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your WeatherAPI.com API key"
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                Get your free API key at{" "}
                <a
                  href="https://www.weatherapi.com/signup.aspx"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  weatherapi.com/signup
                </a>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language">
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {WEATHER_API_LANGUAGES.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Weather data will be returned in the selected language
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="temperature-unit">Temperature Unit</Label>
              <Select value={temperatureUnit} onValueChange={setTemperatureUnit}>
                <SelectTrigger id="temperature-unit">
                  <SelectValue placeholder="Select unit" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="f">Fahrenheit (°F)</SelectItem>
                  <SelectItem value="c">Celsius (°C)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Temperature values will be displayed in the selected unit
              </p>
            </div>
            
            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Save Configuration
                  </>
                )}
              </Button>
              {isEditing && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setApiKey(provider?.apiKey || "");
                    setLanguage(provider?.language || "en");
                    setTemperatureUnit(provider?.temperatureUnit || "f");
                  }}
                >
                  Cancel
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Status</p>
                <div className="flex items-center gap-2 mt-1">
                  {provider.isActive ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Active</span>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4 text-red-600" />
                      <span className="text-red-600">Inactive</span>
                    </>
                  )}
                </div>
              </div>
              <div>
                <p className="text-muted-foreground">API Key</p>
                <p className="font-mono mt-1">{maskApiKey(provider.apiKey)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Base URL</p>
                <p className="mt-1 truncate">{provider.baseUrl}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Language</p>
                <p className="mt-1">
                  {WEATHER_API_LANGUAGES.find(l => l.code === provider.language)?.name || "English"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Temperature Unit</p>
                <p className="mt-1">
                  {provider.temperatureUnit === "c" ? "Celsius (°C)" : "Fahrenheit (°F)"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Last Updated</p>
                <p className="mt-1">{new Date(provider.updatedAt).toLocaleString()}</p>
              </div>
            </div>
            
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                onClick={() => setIsEditing(true)}
                className="gap-2"
              >
                Update Configuration
              </Button>
            </div>
          </>
        )}
        
        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg text-sm">
          <p className="text-blue-900 dark:text-blue-100">
            <strong>Weather Features:</strong> Current conditions, hourly/daily forecasts,
            air quality, astronomy data, and weather alerts
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function maskApiKey(key: string): string {
  if (!key) return "Not configured";
  if (key.length <= 8) return "•".repeat(key.length);
  return `${key.substring(0, 4)}${"•".repeat(key.length - 8)}${key.substring(key.length - 4)}`;
}
