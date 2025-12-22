import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Checkbox } from "./ui/checkbox";
import { ScrollArea } from "./ui/scroll-area";
import {
  Database,
  Cloud,
  TrendingUp,
  Newspaper,
  CloudSun,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Bug,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Clock,
  School,
  Trophy,
  Plus,
  Trash2,
  Search,
  Map
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { supabase } from "../utils/supabase/client";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { copyToClipboard as copyTextToClipboard } from "../utils/clipboard";
import { DashboardNavigation, type DashboardView } from "./DashboardNavigation";

// Categories for display
type ProviderCategory = "weather" | "sports" | "news" | "finance" | "school_closings" | "maps";

// RPC response interface (from list_providers_with_status_all/category)
interface DataProvider {
  id: string;
  name: string;
  type: string;
  category: ProviderCategory;
  is_active: boolean;
  api_key_configured: boolean;
  api_key_len: number;
  api_secret_configured: boolean;
  api_secret_len: number;
  source_url?: string | null;
  storage_path?: string | null;
  refresh_interval_minutes?: number | null;
}

// Full provider data for editing
interface ProviderFullData {
  id: string;
  name: string;
  type: string;
  category: ProviderCategory;
  description?: string;
  is_active: boolean;
  api_key: string;
  api_secret: string;
  base_url: string;
  source_url?: string | null;
  storage_path?: string | null;
  api_version: string;
  config: any;
  created_at: string;
  updated_at: string;
  refresh_interval_minutes?: number | null;
}

interface FeedsDashboardProps {
  initialCategory?: ProviderCategory | "All";
  onNavigate?: (view: DashboardView) => void;
  dashboardConfig?: Array<{
    dashboard_id: string;
    visible: boolean;
    order_index: number;
  }>;
}

export function FeedsDashboardWithSupabase({
  initialCategory,
  onNavigate,
  dashboardConfig,
}: FeedsDashboardProps) {
  const [providers, setProviders] = useState<DataProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ProviderCategory | "All">(
    initialCategory || "All"
  );
  const [searchText, setSearchText] = useState("");
  
  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editProvider, setEditProvider] = useState<ProviderFullData | null>(null);
  const [showEditApiKey, setShowEditApiKey] = useState(false);
  const [showEditApiSecret, setShowEditApiSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  
  // Edit form state
  const [editFormData, setEditFormData] = useState({
    is_active: false,
    api_key: "",
    api_secret: "",
    base_url: "",
    source_url: "",
    storage_path: "",
    api_version: "",
    language: "",
    units: "metric",
    selectedLeagues: [] as string[],
    refresh_interval_minutes: 15,
    // School closings config
    endpoint: "",
    region_id: "",
    sample_url: "",
    selectedRegions: [] as string[],
    selectedZones: [] as string[],
    regionZonePairs: [] as { region_id: string; zone_id: string }[],
    newRegion: "",
    newZone: "",
  });

  // Sports leagues state
  const [availableLeagues, setAvailableLeagues] = useState<any[]>([]);
  const [loadingLeagues, setLoadingLeagues] = useState(false);
  
  // Add dialog state
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [addFormData, setAddFormData] = useState({
    name: "",
    description: "",
    type: "api" as string,
    category: "weather" as ProviderCategory,
    is_active: true,
    api_key: "",
    api_secret: "",
    base_url: "",
    source_url: "",
    storage_path: "",
    api_version: "",
    language: "en",
    units: "metric",
    selectedLeagues: [] as string[],
    refresh_interval_minutes: 15,
    // School closings config
    endpoint: "",
    region_id: "",
    sample_url: "",
  });
  const [showAddApiKey, setShowAddApiKey] = useState(false);
  const [showAddApiSecret, setShowAddApiSecret] = useState(false);
  const [adding, setAdding] = useState(false);
  
  // Delete confirmation state
  const [providerToDelete, setProviderToDelete] = useState<DataProvider | null>(null);
  const [deleting, setDeleting] = useState(false);
  
  // Debug dialog state
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugProvider, setDebugProvider] = useState<DataProvider | null>(null);
  const [debugFullData, setDebugFullData] = useState<any>(null);
  const [showDebugApiKey, setShowDebugApiKey] = useState(false);
  const [showDebugApiSecret, setShowDebugApiSecret] = useState(false);

  // Load data providers using RPC functions
  const loadProviders = async (category?: ProviderCategory) => {
    setLoading(true);
    try {
      let url: string;
      
      if (category && category !== "All") {
        // Use category-filtered RPC
        url = getRestUrl('rpc/list_providers_with_status_category');
      } else {
        // Use all providers RPC
        url = getRestUrl('rpc/list_providers_with_status_all');
      }

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${getSupabaseAnonKey()}`,
          apikey: getSupabaseAnonKey(),
          "Content-Type": "application/json",
        },
        body: category && category !== "All" 
          ? JSON.stringify({ p_category: category.toLowerCase() })
          : JSON.stringify({}),
      });

      if (!response.ok) {
        if (response.status === 404) {
          console.error("RPC functions not found - migration 009 not run");
          toast.error("Provider status RPC not set up. Run migration 009.");
          setProviders([]);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Loaded providers data:", data);
      console.log("📊 First provider refresh_interval_minutes:", data?.[0]?.refresh_interval_minutes);
      setProviders(data || []);
    } catch (error) {
      console.error("Error loading data providers:", error);
      toast.error("Failed to load data providers");
      setProviders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProviders(selectedCategory === "All" ? undefined : selectedCategory);
  }, [selectedCategory]);

  const handleRefresh = async () => {
    toast.info("Refreshing providers...");
    await loadProviders(selectedCategory === "All" ? undefined : selectedCategory);
    toast.success("Providers refreshed");
  };

  const handleEdit = async (provider: DataProvider) => {
    console.log("Edit button clicked for provider:", provider);
    
    try {
      // Fetch full details using secure RPC function
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

      if (!rpcResponse.ok) {
        throw new Error(`Failed to fetch provider details: ${rpcResponse.status}`);
      }

      const details = await rpcResponse.json();
      console.log("Fetched provider data from RPC:", details);
      
      if (details && details.length > 0) {
        const fullProvider = details[0];
        setEditProvider(fullProvider);
        
        // Initialize form data
        const config = fullProvider.config || {};
        
        // Handle both old and new config structures
        let pairs: { region_id: string; zone_id: string }[] = [];
        if (config.regions && Array.isArray(config.regions)) {
          // New structure: regions array
          pairs = config.regions;
        } else if (config.region_id) {
          // Old structure: comma-separated strings (for backwards compatibility)
          const regionIds = Array.isArray(config.region_id) 
            ? config.region_id 
            : config.region_id.split(',').map((r: string) => r.trim()).filter(Boolean);
          const zoneIds = config.zone_id 
            ? (Array.isArray(config.zone_id) ? config.zone_id : config.zone_id.split(',').map((z: string) => z.trim()).filter(Boolean))
            : [];
          pairs = regionIds.map((region: string, index: number) => ({
            region_id: region,
            zone_id: zoneIds[index] || ""
          }));
        }
        
        const regionIds = pairs.map(p => p.region_id);
        const zoneIds = pairs.map(p => p.zone_id);
        
        setEditFormData({
          is_active: fullProvider.is_active,
          api_key: fullProvider.api_key || "",
          api_secret: fullProvider.api_secret || "",
          base_url: fullProvider.base_url || "",
          source_url: fullProvider.source_url || "",
          storage_path: fullProvider.storage_path || "",
          api_version: fullProvider.api_version || "",
          language: config.language || "en",
          units: config.units || "metric",
          selectedLeagues: config.leagues || [],
          refresh_interval_minutes: fullProvider.refresh_interval_minutes || 15,
          // School closings config
          endpoint: config.endpoint || "",
          region_id: config.region_id || "",
          sample_url: config.sample_url || "",
          selectedRegions: regionIds,
          selectedZones: zoneIds,
          regionZonePairs: pairs,
          newRegion: "",
          newZone: "",
        });
        
        // If sports provider, load available leagues
        if (fullProvider.category === 'sports' && fullProvider.type === 'sportmonks') {
          await fetchAvailableLeagues();
        }
        
        setShowEditApiKey(false);
        setShowEditApiSecret(false);
        setEditDialogOpen(true);
      } else {
        console.error("No provider data returned from RPC");
        toast.error("No provider data found");
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
      toast.error(`Failed to load provider details: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  };

  const fetchAvailableLeagues = async () => {
    setLoadingLeagues(true);
    try {
      console.log('[Edit] Fetching leagues from backend endpoint');
      
      const response = await fetch(
        getEdgeFunctionUrl('sports_dashboard/sports/sportmonks/soccer/leagues'),
        {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Edit] Leagues fetch failed:', response.status, errorText);
        throw new Error(`Failed to fetch leagues: ${response.status}`);
      }

      const data = await response.json();
      console.log('[Edit] Leagues API response:', data);
      
      // SportMonks API returns { data: [...] }
      const leagues = data.data || [];
      setAvailableLeagues(leagues);
      
      if (leagues.length > 0) {
        toast.success(`Loaded ${leagues.length} leagues`);
      } else {
        toast.info('No leagues available');
      }
    } catch (error) {
      console.error('[Edit] Error fetching leagues:', error);
      toast.error(`Failed to load leagues: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setAvailableLeagues([]);
    } finally {
      setLoadingLeagues(false);
    }
  };

  const handleLeagueToggle = (leagueId: string, checked: boolean) => {
    const newSelection = checked
      ? [...editFormData.selectedLeagues, leagueId]
      : editFormData.selectedLeagues.filter(id => id !== leagueId);
    
    setEditFormData({ ...editFormData, selectedLeagues: newSelection });
  };

  const handleSave = async () => {
    if (!editProvider) return;
    
    console.log("Save button clicked. Form data:", editFormData);
    setSaving(true);
    try {
      // Build config object
      const configObj: any = { ...editProvider.config };
      
      // Add category-specific config
      if (editProvider.category === 'weather') {
        configObj.language = editFormData.language;
        configObj.units = editFormData.units;
      } else if (editProvider.category === 'sports') {
        configObj.leagues = editFormData.selectedLeagues.map(id => Number(id));
      } else if (editProvider.category === 'school_closings') {
        // Structure config with regions array
        configObj.endpoint = editFormData.endpoint;
        configObj.regions = editFormData.regionZonePairs;
        configObj.sample_url = editFormData.sample_url;
      }

      // Use singleton Supabase client

      // Use RPC to update provider settings
      const { data, error } = await supabase.rpc('update_provider_settings_by_id', {
        p_allow_api_key: true,
        p_api_key: editFormData.api_key || null,
        p_api_secret: editFormData.api_secret || null,
        p_api_version: editFormData.api_version || null,
        p_base_url: editFormData.base_url || null,
        p_source_url: editFormData.source_url || null,
        p_storage_path: editFormData.storage_path || null,
        p_config_patch: configObj,
        p_dashboard: 'nova',
        p_id: editProvider.id,
        p_is_active: editFormData.is_active
      });

      if (error) {
        console.error("RPC save failed:", error);
        throw new Error(`Failed to save provider: ${error.message}`);
      }

      // Update refresh_interval_minutes separately
      const { error: refreshError } = await supabase
        .from("data_providers")
        .update({ refresh_interval_minutes: editFormData.refresh_interval_minutes })
        .eq("id", editProvider.id);

      if (refreshError) {
        console.error("Failed to update refresh interval:", refreshError);
        toast.error("Provider saved but refresh interval update failed");
      }

      console.log("Provider saved successfully via RPC", data);
      toast.success("Provider updated successfully");
      
      setEditDialogOpen(false);

      // Reload providers
      console.log("Reloading providers...");
      await loadProviders(selectedCategory === "All" ? undefined : selectedCategory);
    } catch (error) {
      console.error("Error saving provider:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save provider");
    } finally {
      setSaving(false);
    }
  };

  const handleAdd = async () => {
    console.log("Add button clicked. Form data:", addFormData);
    
    // Validate required fields
    if (!addFormData.name || !addFormData.name.trim()) {
      toast.error("Provider name is required");
      return;
    }
    
    if (!addFormData.base_url && addFormData.type !== 'local' && addFormData.type !== 'csv') {
      toast.error("Base URL is required for API providers");
      return;
    }
    
    if (!addFormData.source_url && (addFormData.type === 'local' || addFormData.type === 'csv')) {
      toast.error("Source URL is required for local/CSV providers");
      return;
    }
    
    setAdding(true);
    try {
      // Build config object
      const configObj: any = {};
      
      if (addFormData.category === 'weather') {
        configObj.language = addFormData.language;
        configObj.units = addFormData.units;
      } else if (addFormData.category === 'sports') {
        configObj.leagues = addFormData.selectedLeagues.map(id => Number(id));
      } else if (addFormData.category === 'school_closings') {
        configObj.endpoint = addFormData.endpoint;
        configObj.region_id = addFormData.region_id;
        configObj.sample_url = addFormData.sample_url;
      }

      // Use RPC to create provider with proper security
      const { data, error } = await supabase.rpc('create_data_provider', {
        _type: addFormData.type,
        _category: addFormData.category,
        _name: addFormData.name.trim(),
        _description: addFormData.description || null,
        _api_key: addFormData.api_key || null,
        _api_secret: addFormData.api_secret || null,
        _base_url: addFormData.base_url || null,
        _api_version: addFormData.api_version || null,
        _config: configObj,
        _refresh_interval_minutes: addFormData.refresh_interval_minutes,
      });

      if (error) {
        console.error("Failed to add provider:", error);
        throw new Error(`Failed to add provider: ${error.message}`);
      }

      console.log("Provider added successfully", data);
      toast.success(`Provider "${addFormData.name}" added successfully`);
      
      setAddDialogOpen(false);
      
      // Reset form
      setAddFormData({
        name: "",
        description: "",
        type: "api",
        category: "weather",
        is_active: true,
        api_key: "",
        api_secret: "",
        base_url: "",
        source_url: "",
        storage_path: "",
        api_version: "",
        language: "en",
        units: "metric",
        selectedLeagues: [],
        refresh_interval_minutes: 15,
        endpoint: "",
        region_id: "",
        sample_url: "",
      });

      // Reload providers
      await loadProviders(selectedCategory === "All" ? undefined : selectedCategory);
    } catch (error) {
      console.error("Error adding provider:", error);
      toast.error(error instanceof Error ? error.message : "Failed to add provider");
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async () => {
    if (!providerToDelete) return;
    
    setDeleting(true);
    try {
      console.log("🗑️ Deleting provider:", providerToDelete.id);
      
      const { data, error } = await supabase.rpc('delete_data_provider', {
        _id: providerToDelete.id
      });

      if (error) {
        console.error("❌ Failed to delete provider:", error.message);
        throw new Error(`Failed to delete provider: ${error.message}`);
      }

      console.log("✅ Deleted provider:", data);
      toast.success(`Provider "${providerToDelete.name}" deleted successfully`);
      
      setProviderToDelete(null);
      
      // Reload providers
      await loadProviders(selectedCategory === "All" ? undefined : selectedCategory);
    } catch (error) {
      console.error("Error deleting provider:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete provider");
    } finally {
      setDeleting(false);
    }
  };

  const handleTestConnection = async () => {
    if (!editProvider) return;
    
    setTestingConnection(true);
    try {
      console.log("🧪 Testing provider connection...");
      toast.info("Testing provider connection...");
      
      // Validate required fields first
      const issues = [];
      if (!editFormData.api_key) {
        issues.push("API key not configured");
      }
      if (!editFormData.base_url) {
        issues.push("Base URL not configured");
      }
      
      if (issues.length > 0) {
        toast.error(`Configuration issues: ${issues.join(", ")}`);
        return;
      }
      
      // Build config object
      const configObj: any = {};
      if (editProvider.category === 'weather') {
        configObj.language = editFormData.language;
        configObj.temperatureUnit = editFormData.units;
      } else if (editProvider.category === 'sports') {
        configObj.leagues = editFormData.selectedLeagues;
      } else if (editProvider.category === 'school_closings') {
        configObj.endpoint = editFormData.endpoint;
        configObj.region_id = editFormData.region_id;
        configObj.sample_url = editFormData.sample_url;
      }
      
      // Determine the correct edge function based on category
      const edgeFunction = editProvider.category === 'weather' 
        ? 'weather_dashboard' 
        : 'make-server-cbef71cf';
      
      // Call backend test endpoint
      const response = await fetch(
        getEdgeFunctionUrl(`${edgeFunction}/test-provider`),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            category: editProvider.category,
            type: editProvider.type,
            api_key: editFormData.api_key,
            api_secret: editFormData.api_secret || undefined,
            base_url: editFormData.base_url,
            config: configObj,
          }),
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error("Test failed:", errorData);
        toast.error(`Test failed: ${errorData.message || errorData.error || 'Unknown error'}`);
        return;
      }
      
      const result = await response.json();
      console.log("🧪 Test result:", result);
      
      if (result.success) {
        toast.success(result.message || "Connection test successful!");
        if (result.details) {
          console.log("Test details:", result.details);
        }
        
        // If this is a SportMonks provider and test was successful, parse leagues from response
        if (editProvider.category === 'sports' && editProvider.type === 'sportmonks' && result.details?.sampleLeagues) {
          console.log('📋 Parsing leagues from test response...');
          setLoadingLeagues(true);
          
          try {
            // Convert sampleLeagues (string array) to league objects
            const sampleLeagues = result.details.sampleLeagues as string[];
            const leagues = sampleLeagues.map((leagueName, index) => ({
              id: `sm_${index + 1}`,
              name: leagueName,
              country: undefined,
              type: 'Football'
            }));
            
            setAvailableLeagues(leagues);
            console.log(`📋 Parsed ${leagues.length} leagues from test response:`, leagues);
            
            if (leagues.length > 0) {
              toast.success(`Connection successful! Loaded ${leagues.length} available leagues`);
            }
          } catch (leaguesError) {
            console.error('Error parsing leagues:', leaguesError);
            // Don't show error toast here - test was successful, leagues are optional
          } finally {
            setLoadingLeagues(false);
          }
        }
      } else {
        toast.error(result.message || "Connection test failed");
        if (result.details) {
          console.error("Test error details:", result.details);
        }
      }
    } catch (error) {
      console.error("Connection test error:", error);
      toast.error(error instanceof Error ? error.message : "Connection test failed");
    } finally {
      setTestingConnection(false);
    }
  };

  const handleDebug = async (provider: DataProvider) => {
    console.log("Debug button clicked for provider:", provider);
    
    setDebugProvider(provider);
    setShowDebugApiKey(false);
    setShowDebugApiSecret(false);
    
    try {
      // Fetch full details using secure RPC function
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

      if (!rpcResponse.ok) {
        throw new Error(`Failed to fetch provider details: ${rpcResponse.status}`);
      }

      const details = await rpcResponse.json();
      console.log("Fetched provider data for debug from RPC:", details);
      
      if (details && details.length > 0) {
        setDebugFullData(details[0]);
      } else {
        console.error("No provider data returned from RPC");
        toast.error("No provider data found");
      }
    } catch (error) {
      console.error("Error fetching provider:", error);
      toast.error(`Failed to load provider details: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
    
    setDebugDialogOpen(true);
  };

  const copyToClipboard = async (text: string, label: string) => {
    const success = await copyTextToClipboard(text);
    if (success) {
      toast.success(`${label} copied to clipboard`);
    } else {
      toast.error(`Failed to copy ${label} to clipboard`);
    }
  };

  // Apply client-side search filtering on top of category-filtered providers from RPC
  const filteredProviders = providers.filter((provider) => {
    if (!searchText) return true;
    
    const searchLower = searchText.toLowerCase();
    return (
      provider.name.toLowerCase().includes(searchLower) ||
      provider.type.toLowerCase().includes(searchLower) ||
      provider.category.toLowerCase().includes(searchLower) ||
      (provider.source_url && provider.source_url.toLowerCase().includes(searchLower)) ||
      (provider.storage_path && provider.storage_path.toLowerCase().includes(searchLower))
    );
  });

  const getCategoryIcon = (category: ProviderCategory) => {
    switch (category) {
      case "weather":
        return <CloudSun className="w-5 h-5" />;
      case "sports":
        return <Trophy className="w-5 h-5" />;
      case "news":
        return <Newspaper className="w-5 h-5" />;
      case "finance":
        return <TrendingUp className="w-5 h-5" />;
      case "school_closings":
        return <School className="w-5 h-5" />;
      case "maps":
        return <Map className="w-5 h-5" />;
      default:
        return <Database className="w-5 h-5" />;
    }
  };

  const getCategoryColor = (category: ProviderCategory) => {
    switch (category) {
      case "weather":
        return "text-blue-600 dark:text-blue-400";
      case "sports":
        return "text-purple-600 dark:text-purple-400";
      case "news":
        return "text-orange-600 dark:text-orange-400";
      case "finance":
        return "text-green-600 dark:text-green-400";
      case "school_closings":
        return "text-red-600 dark:text-red-400";
      case "maps":
        return "text-teal-600 dark:text-teal-400";
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  const getStatusBadge = (provider: DataProvider) => {
    // Provider is active if is_active is true
    if (provider.is_active) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
          <CheckCircle className="w-3 h-3 mr-1" />
          Active
        </Badge>
      );
    } else if (!provider.api_key_configured) {
      return (
        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">
          <AlertCircle className="w-3 h-3 mr-1" />
          Not Configured
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-gray-700 dark:text-gray-300">
          <XCircle className="w-3 h-3 mr-1" />
          Disabled
        </Badge>
      );
    }
  };

  return (
    <div className="space-y-6">
      {/* Dashboard Navigation */}
      {onNavigate && (
        <DashboardNavigation
          onNavigate={onNavigate}
          dashboardConfig={dashboardConfig}
        />
      )}
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Database className="w-6 h-6" />
            Data Providers
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage your data provider configurations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => {
            console.log("Add Provider button clicked - opening dialog");
            setAddDialogOpen(true);
          }} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
          <Button onClick={handleRefresh} variant="outline" size="sm">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search providers..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            className="pl-9"
          />
        </div>
        
        <Select
          value={selectedCategory}
          onValueChange={(value) => setSelectedCategory(value as ProviderCategory | "All")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="All">
              All Providers
            </SelectItem>
            <SelectItem value="weather">
              <div className="flex items-center gap-2">
                <CloudSun className="w-4 h-4" />
                Weather
              </div>
            </SelectItem>
            <SelectItem value="sports">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4" />
                Sports
              </div>
            </SelectItem>
            <SelectItem value="news">
              <div className="flex items-center gap-2">
                <Newspaper className="w-4 h-4" />
                News
              </div>
            </SelectItem>
            <SelectItem value="finance">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Finance
              </div>
            </SelectItem>
            <SelectItem value="school_closings">
              <div className="flex items-center gap-2">
                <School className="w-4 h-4" />
                School Closings
              </div>
            </SelectItem>
            <SelectItem value="maps">
              <div className="flex items-center gap-2">
                <Map className="w-4 h-4" />
                Maps
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Providers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            {selectedCategory === "All" 
              ? "All Providers" 
              : selectedCategory === "school_closings"
              ? "School Closings Providers"
              : `${selectedCategory.charAt(0).toUpperCase() + selectedCategory.slice(1)} Providers`}
            <Badge variant="secondary" className="ml-2">
              {filteredProviders.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-6 h-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading providers...</span>
            </div>
          ) : filteredProviders.length === 0 ? (
            <div className="text-center py-12">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {selectedCategory === "All"
                  ? "No providers configured yet."
                  : `No ${selectedCategory} providers configured yet.`}
              </p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Provider</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>API Key</TableHead>
                    <TableHead>API Secret</TableHead>
                    <TableHead>Refresh Interval</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProviders.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className={getCategoryColor(provider.category)}>
                            {getCategoryIcon(provider.category)}
                          </div>
                          <div>
                            <div>{provider.name}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {provider.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="text-xs bg-muted px-2 py-1 rounded">
                          {provider.type}
                        </code>
                      </TableCell>
                      <TableCell>{getStatusBadge(provider)}</TableCell>
                      <TableCell>
                        {provider.api_key_configured ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured ({provider.api_key_len} chars)
                          </Badge>
                        ) : (
                          <Badge variant="destructive">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Configured
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {provider.api_secret_configured ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Configured ({provider.api_secret_len} chars)
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                            <XCircle className="w-3 h-3 mr-1" />
                            Not Set
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-muted-foreground" />
                          <span className="text-sm">
                            {provider.refresh_interval_minutes || 15} min
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(provider)}
                            title="Edit provider"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDebug(provider)}
                            title="Debug provider"
                          >
                            <Bug className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setProviderToDelete(provider)}
                            title="Delete provider"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Provider Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Edit Provider: {editProvider?.name}
            </DialogTitle>
            <DialogDescription>
              Update provider configuration and credentials
            </DialogDescription>
          </DialogHeader>

          {editProvider && (
            <div className="space-y-4">
              {/* Provider Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded-lg">
                <div>
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <div className="mt-1">
                    <Badge variant="outline">{editProvider.type}</Badge>
                  </div>
                </div>
                <div>
                  <span className="text-sm text-muted-foreground">Category:</span>
                  <div className="mt-1">
                    <Badge variant="outline" className="capitalize">
                      {editProvider.category}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Active Status */}
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <Label htmlFor="is_active" className="cursor-pointer">
                    Enable Provider
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    {editFormData.is_active
                      ? "Provider is active and will be used"
                      : "Provider is disabled"}
                  </p>
                </div>
                <Switch
                  id="is_active"
                  checked={editFormData.is_active}
                  onCheckedChange={(checked) =>
                    setEditFormData({ ...editFormData, is_active: checked })
                  }
                />
              </div>

              {/* API Key */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="api_key">API Key</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditApiKey(!showEditApiKey)}
                  >
                    {showEditApiKey ? (
                      <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1" /> Show</>
                    )}
                  </Button>
                </div>
                <Input
                  id="api_key"
                  type={showEditApiKey ? "text" : "password"}
                  value={editFormData.api_key}
                  onChange={(e) => setEditFormData({ ...editFormData, api_key: e.target.value })}
                  placeholder="Enter API key"
                />
              </div>

              {/* API Secret */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="api_secret">API Secret (Optional)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowEditApiSecret(!showEditApiSecret)}
                  >
                    {showEditApiSecret ? (
                      <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                    ) : (
                      <><Eye className="w-3 h-3 mr-1" /> Show</>
                    )}
                  </Button>
                </div>
                <Input
                  id="api_secret"
                  type={showEditApiSecret ? "text" : "password"}
                  value={editFormData.api_secret}
                  onChange={(e) => setEditFormData({ ...editFormData, api_secret: e.target.value })}
                  placeholder="Enter API secret (if required)"
                />
              </div>

              {/* Base URL or Storage Path depending on provider type */}
              {(editProvider.type === 'local' || editProvider.type === 'csv') ? (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Local Provider Paths</h3>
                  <div className="space-y-2">
                    <Label htmlFor="source_url">Source URL</Label>
                    <Input
                      id="source_url"
                      value={editFormData.source_url}
                      onChange={(e) => setEditFormData({ ...editFormData, source_url: e.target.value })}
                      placeholder="file:///C:/path/to/data.csv or https://example.com/data.csv"
                    />
                    <p className="text-xs text-muted-foreground">
                      File URL format (e.g., file:///C:/Users/...) or HTTP URL
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="storage_path">Storage Path</Label>
                    <Input
                      id="storage_path"
                      value={editFormData.storage_path}
                      onChange={(e) => setEditFormData({ ...editFormData, storage_path: e.target.value })}
                      placeholder="C:\path\to\data.csv"
                    />
                    <p className="text-xs text-muted-foreground">
                      File system path (e.g., C:\Users\...)
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="base_url">Base URL</Label>
                  <Input
                    id="base_url"
                    value={editFormData.base_url}
                    onChange={(e) => setEditFormData({ ...editFormData, base_url: e.target.value })}
                    placeholder="https://api.example.com"
                  />
                </div>
              )}

              {/* API Version */}
              <div className="space-y-2">
                <Label htmlFor="api_version">API Version (Optional)</Label>
                <Input
                  id="api_version"
                  value={editFormData.api_version}
                  onChange={(e) => setEditFormData({ ...editFormData, api_version: e.target.value })}
                  placeholder="v1, v3, etc."
                />
              </div>

              {/* Refresh Interval */}
              <div className="space-y-2">
                <Label htmlFor="refresh_interval">Refresh Interval (Minutes)</Label>
                <Input
                  id="refresh_interval"
                  type="number"
                  min="1"
                  max="1440"
                  value={editFormData.refresh_interval_minutes}
                  onChange={(e) => setEditFormData({ ...editFormData, refresh_interval_minutes: parseInt(e.target.value) || 15 })}
                  placeholder="15"
                />
                <p className="text-xs text-muted-foreground">
                  How often the provider should fetch new data (1-1440 minutes)
                </p>
              </div>

              {/* Weather-specific options */}
              {editProvider.category === 'weather' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">Weather Options</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="language">Language</Label>
                    <Select
                      value={editFormData.language}
                      onValueChange={(value) => setEditFormData({ ...editFormData, language: value })}
                    >
                      <SelectTrigger id="language">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="it">Italian</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="units">Temperature Units</Label>
                    <Select
                      value={editFormData.units}
                      onValueChange={(value) => setEditFormData({ ...editFormData, units: value })}
                    >
                      <SelectTrigger id="units">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="metric">Celsius (°C)</SelectItem>
                        <SelectItem value="imperial">Fahrenheit (°F)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Sports-specific options (SportMonks leagues) */}
              {editProvider.category === 'sports' && editProvider.type === 'sportmonks' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">League Selection</h3>
                    <Button
                      onClick={async () => {
                        if (!editProvider) return;
                        
                        setLoadingLeagues(true);
                        try {
                          console.log('[FetchLeagues] Fetching leagues from SportMonks...');
                          
                          const endpoint = getEdgeFunctionUrl('sports_dashboard/sports/sportmonks/soccer/leagues');
                          const response = await fetch(endpoint, {
                            headers: {
                              'Authorization': `Bearer ${getSupabaseAnonKey()}`,
                              'apikey': getSupabaseAnonKey(),
                            },
                          });

                          if (!response.ok) {
                            const errorText = await response.text();
                            console.error('[FetchLeagues] Failed:', response.status, errorText);
                            toast.error(`Failed to fetch leagues: ${response.status}`);
                            return;
                          }

                          const data = await response.json();
                          console.log('[FetchLeagues] Response:', data);
                          
                          // Transform leagues into league-season combinations
                          const leagues = Array.isArray(data?.data) ? data.data : [];
                          const leagueSeasonCombos: any[] = [];
                          
                          for (const lg of leagues) {
                            const seasons = Array.isArray(lg.seasons) ? lg.seasons : (lg.seasons?.data ?? []);
                            
                            if (!seasons.length) {
                              leagueSeasonCombos.push({
                                id: lg.id,
                                name: lg.name,
                                sport: 'football',
                                abbrev: lg.short_code ?? null,
                                seasonId: null,
                                seasonName: 'No Season',
                                uniqueKey: `${lg.id}-no-season`,
                              });
                              continue;
                            }
                            
                            const current = seasons.find((s: any) => s.is_current) ?? seasons[seasons.length - 1];
                            
                            for (const s of seasons) {
                              leagueSeasonCombos.push({
                                id: lg.id,
                                name: lg.name,
                                sport: 'football',
                                abbrev: lg.short_code ?? null,
                                selectedSeason: current?.id ?? null,
                                seasonId: s.id,
                                seasonName: s.name,
                                uniqueKey: `${lg.id}-${s.id}`,
                              });
                            }
                          }
                          
                          console.log('[FetchLeagues] Created', leagueSeasonCombos.length, 'league-season combinations');
                          setAvailableLeagues(leagueSeasonCombos);
                          toast.success(`Loaded ${leagueSeasonCombos.length} league-season combinations`);
                          
                        } catch (error) {
                          console.error('[FetchLeagues] Error:', error);
                          toast.error(`Failed to fetch leagues: ${error}`);
                        } finally {
                          setLoadingLeagues(false);
                        }
                      }}
                      disabled={loadingLeagues || !editProvider}
                      size="sm"
                      variant="outline"
                      className="gap-2"
                    >
                      {loadingLeagues ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4" />
                          Fetch Leagues
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {availableLeagues.length > 0 ? (
                    <>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary">{availableLeagues.length} available</Badge>
                        <Badge variant="default">{editFormData.selectedLeagues.length} selected</Badge>
                      </div>
                      
                      <ScrollArea className="h-64 border rounded-lg p-3">
                        <div className="space-y-2">
                          {availableLeagues.map((item) => {
                            const isSelected = editFormData.selectedLeagues.includes(item.uniqueKey);
                            return (
                              <div 
                                key={item.uniqueKey} 
                                className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                                  isSelected ? 'bg-primary/10 border border-primary' : 'hover:bg-muted border border-transparent'
                                }`}
                                onClick={() => handleLeagueToggle(item.uniqueKey, !isSelected)}
                              >
                                <Checkbox
                                  id={`league-${item.uniqueKey}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) => handleLeagueToggle(item.uniqueKey, checked as boolean)}
                                  className="mt-0.5"
                                />
                                <div className="flex-1">
                                  <Label htmlFor={`league-${item.uniqueKey}`} className="cursor-pointer">
                                    {item.name}
                                  </Label>
                                  <p className="text-sm text-muted-foreground mt-0.5">
                                    Season: {item.seasonName}
                                  </p>
                                  <div className="flex gap-1 mt-1">
                                    <Badge variant="outline" className="text-xs">{item.sport}</Badge>
                                    {item.abbrev && (
                                      <Badge variant="secondary" className="text-xs">
                                        {item.abbrev}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {loadingLeagues ? 'Loading leagues...' : 'Click "Fetch Leagues" to load available leagues and seasons'}
                    </p>
                  )}
                  
                  <p className="text-xs text-muted-foreground">
                    Selected: {editFormData.selectedLeagues.length} league-season combination(s)
                  </p>
                </div>
              )}

              {/* School Closings-specific options */}
              {editProvider.category === 'school_closings' && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <h3 className="font-semibold">School Closings Configuration</h3>
                  
                  <div className="space-y-2">
                    <Label htmlFor="endpoint">API Endpoint</Label>
                    <Input
                      id="endpoint"
                      value={editFormData.endpoint}
                      onChange={(e) => setEditFormData({ ...editFormData, endpoint: e.target.value })}
                      placeholder="/GetClosings?sOrganizationName=&sRegionId=42&sZoneId="
                    />
                    <p className="text-xs text-muted-foreground">
                      The API endpoint path with query parameters
                    </p>
                  </div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label htmlFor="region_id">Region ID</Label>
                      </div>
                      <div>
                        <Label htmlFor="zone_id">Zone ID (Optional)</Label>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Input
                        id="region_id"
                        type="number"
                        value={editFormData.newRegion}
                        onChange={(e) => setEditFormData({ ...editFormData, newRegion: e.target.value })}
                        placeholder="42"
                        className="flex-1"
                      />
                      <Input
                        id="zone_id"
                        type="number"
                        value={editFormData.newZone}
                        onChange={(e) => setEditFormData({ ...editFormData, newZone: e.target.value })}
                        placeholder="1"
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        size="default"
                        onClick={() => {
                          if (editFormData.newRegion.trim()) {
                            const existingPair = editFormData.regionZonePairs.find(
                              (p) => p.region_id === editFormData.newRegion.trim()
                            );
                            if (!existingPair) {
                              setEditFormData({
                                ...editFormData,
                                regionZonePairs: [
                                  ...editFormData.regionZonePairs,
                                  {
                                    region_id: editFormData.newRegion.trim(),
                                    zone_id: editFormData.newZone.trim(),
                                  },
                                ],
                                selectedRegions: [...editFormData.selectedRegions, editFormData.newRegion.trim()],
                                selectedZones: [...editFormData.selectedZones, editFormData.newZone.trim()],
                                newRegion: "",
                                newZone: "",
                              });
                              toast.success(`Added region: ${editFormData.newRegion.trim()}${editFormData.newZone.trim() ? ` with zone: ${editFormData.newZone.trim()}` : ''}`);
                            } else {
                              toast.error("Region already added");
                            }
                          } else {
                            toast.error("Region ID is required");
                          }
                        }}
                      >
                        Add
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      The region identifier for school closings data
                    </p>

                    {editFormData.regionZonePairs.length > 0 && (
                      <div className="border rounded-md mt-2">
                        <ScrollArea className="h-[120px]">
                          <div className="p-2 space-y-2">
                            {editFormData.regionZonePairs.map((pair, index) => (
                              <div key={index} className="flex items-center justify-between space-x-2 p-2 hover:bg-muted rounded-md transition-colors">
                                <div className="flex-1">
                                  <span className="text-sm font-medium">Region: {pair.region_id}</span>
                                  {pair.zone_id && (
                                    <span className="text-sm text-muted-foreground ml-2">| Zone: {pair.zone_id}</span>
                                  )}
                                </div>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setEditFormData({
                                      ...editFormData,
                                      regionZonePairs: editFormData.regionZonePairs.filter((_, i) => i !== index),
                                      selectedRegions: editFormData.selectedRegions.filter((r) => r !== pair.region_id),
                                      selectedZones: editFormData.selectedZones.filter((_, i) => i !== index),
                                    });
                                    toast.success(`Removed region: ${pair.region_id}`);
                                  }}
                                  className="h-6 w-6 p-0"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                    
                    {editFormData.regionZonePairs.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        {editFormData.regionZonePairs.length} region{editFormData.regionZonePairs.length !== 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="sample_url">Sample URL (Optional)</Label>
                    <Input
                      id="sample_url"
                      value={editFormData.sample_url}
                      onChange={(e) => setEditFormData({ ...editFormData, sample_url: e.target.value })}
                      placeholder="https://example.com/sample.xml"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional URL to a sample data file for testing
                    </p>
                  </div>
                </div>
              )}

              {/* Test Connection Button */}
              <Button
                onClick={handleTestConnection}
                disabled={testingConnection}
                variant="outline"
                className="w-full"
              >
                {testingConnection ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Testing Connection...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Test Connection
                  </>
                )}
              </Button>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Debug Provider Dialog */}
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bug className="w-5 h-5" />
              Debug Provider: {debugProvider?.name}
            </DialogTitle>
            <DialogDescription>
              View detailed configuration, credentials, and test connectivity
            </DialogDescription>
          </DialogHeader>

          {debugFullData && (
            <div className="space-y-6">
              {/* Provider Info */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Provider Information
                </h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">ID:</span>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-muted px-2 py-1 rounded flex-1">
                        {debugFullData.id}
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard(debugFullData.id, "ID")}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Type:</span>
                    <div className="mt-1">
                      <Badge variant="outline">{debugFullData.type}</Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Category:</span>
                    <div className="mt-1">
                      <Badge variant="outline" className="capitalize">
                        {debugFullData.category}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <div className="mt-1">
                      {debugProvider && getStatusBadge(debugProvider)}
                    </div>
                  </div>
                  {debugFullData.description && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Description:</span>
                      <div className="mt-1">
                        <p className="text-xs">{debugFullData.description}</p>
                      </div>
                    </div>
                  )}
                  <div>
                    <span className="text-muted-foreground">API Version:</span>
                    <div className="mt-1">
                      <code className="text-xs">
                        {debugFullData.api_version || "—"}
                      </code>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base URL:</span>
                    <div className="mt-1">
                      <code className="text-xs break-all">
                        {debugFullData.base_url || "—"}
                      </code>
                    </div>
                  </div>
                  {debugFullData.source_url && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Source URL:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                          {debugFullData.source_url}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(debugFullData.source_url || "", "Source URL")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                  {debugFullData.storage_path && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Storage Path:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="text-xs bg-muted px-2 py-1 rounded flex-1 break-all">
                          {debugFullData.storage_path}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(debugFullData.storage_path || "", "Storage Path")}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Credentials */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Eye className="w-4 h-4" />
                  Credentials
                </h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">API Key:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebugApiKey(!showDebugApiKey)}
                      >
                        {showDebugApiKey ? (
                          <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                        ) : (
                          <><Eye className="w-3 h-3 mr-1" /> Show</>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">
                        {showDebugApiKey
                          ? debugFullData.api_key || "Not configured"
                          : debugFullData.api_key
                          ? "•".repeat(debugFullData.api_key.length)
                          : "Not configured"}
                      </code>
                      {debugFullData.api_key && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(debugFullData.api_key, "API Key")
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-muted-foreground">API Secret:</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDebugApiSecret(!showDebugApiSecret)}
                      >
                        {showDebugApiSecret ? (
                          <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                        ) : (
                          <><Eye className="w-3 h-3 mr-1" /> Show</>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 text-xs bg-muted px-3 py-2 rounded break-all">
                        {showDebugApiSecret
                          ? debugFullData.api_secret || "Not set"
                          : debugFullData.api_secret
                          ? "•".repeat(debugFullData.api_secret.length)
                          : "Not set"}
                      </code>
                      {debugFullData.api_secret && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            copyToClipboard(debugFullData.api_secret, "API Secret")
                          }
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Configuration JSON */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Configuration
                </h3>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                    {JSON.stringify(debugFullData.config || {}, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(debugFullData.config || {}, null, 2),
                        "Configuration"
                      )
                    }
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="font-semibold mb-3">Timestamps</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="text-muted-foreground">Created:</span>
                    <div className="mt-1">
                      {new Date(debugFullData.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Last Updated:</span>
                    <div className="mt-1">
                      {new Date(debugFullData.updated_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Raw Data */}
              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <Database className="w-4 h-4" />
                  Raw Database Record
                </h3>
                <div className="relative">
                  <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto max-h-64">
                    {JSON.stringify(debugFullData, null, 2)}
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() =>
                      copyToClipboard(
                        JSON.stringify(debugFullData, null, 2),
                        "Raw data"
                      )
                    }
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDebugDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Provider Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add New Provider
            </DialogTitle>
            <DialogDescription>
              Configure a new data provider
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Provider Name */}
            <div className="space-y-2">
              <Label htmlFor="add_name">Provider Name *</Label>
              <Input
                id="add_name"
                value={addFormData.name}
                onChange={(e) => setAddFormData({ ...addFormData, name: e.target.value })}
                placeholder="My Weather Provider"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="add_description">Description</Label>
              <Input
                id="add_description"
                value={addFormData.description}
                onChange={(e) => setAddFormData({ ...addFormData, description: e.target.value })}
                placeholder="Brief description of this provider"
              />
            </div>

            {/* Type and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="add_type">Provider Type *</Label>
                <Select
                  value={addFormData.type}
                  onValueChange={(value) => setAddFormData({ ...addFormData, type: value })}
                >
                  <SelectTrigger id="add_type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="api">API</SelectItem>
                    <SelectItem value="local">Local File</SelectItem>
                    <SelectItem value="csv">CSV File</SelectItem>
                    <SelectItem value="sportmonks">SportMonks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="add_category">Category *</Label>
                <Select
                  value={addFormData.category}
                  onValueChange={(value) => setAddFormData({ ...addFormData, category: value as ProviderCategory })}
                >
                  <SelectTrigger id="add_category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weather">Weather</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="news">News</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="school_closings">School Closings</SelectItem>
                    <SelectItem value="maps">Maps</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Active Status */}
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <Label htmlFor="add_is_active" className="cursor-pointer">
                  Enable Provider
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {addFormData.is_active
                    ? "Provider is active and will be used"
                    : "Provider is disabled"}
                </p>
              </div>
              <Switch
                id="add_is_active"
                checked={addFormData.is_active}
                onCheckedChange={(checked) =>
                  setAddFormData({ ...addFormData, is_active: checked })
                }
              />
            </div>

            {/* API Key */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="add_api_key">API Key</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddApiKey(!showAddApiKey)}
                >
                  {showAddApiKey ? (
                    <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Show</>
                  )}
                </Button>
              </div>
              <Input
                id="add_api_key"
                type={showAddApiKey ? "text" : "password"}
                value={addFormData.api_key}
                onChange={(e) => setAddFormData({ ...addFormData, api_key: e.target.value })}
                placeholder="Enter API key"
              />
            </div>

            {/* API Secret */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="add_api_secret">API Secret (Optional)</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddApiSecret(!showAddApiSecret)}
                >
                  {showAddApiSecret ? (
                    <><EyeOff className="w-3 h-3 mr-1" /> Hide</>
                  ) : (
                    <><Eye className="w-3 h-3 mr-1" /> Show</>
                  )}
                </Button>
              </div>
              <Input
                id="add_api_secret"
                type={showAddApiSecret ? "text" : "password"}
                value={addFormData.api_secret}
                onChange={(e) => setAddFormData({ ...addFormData, api_secret: e.target.value })}
                placeholder="Enter API secret (if required)"
              />
            </div>

            {/* Base URL or Source URL depending on provider type */}
            {(addFormData.type === 'local' || addFormData.type === 'csv') ? (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Local Provider Paths</h3>
                <div className="space-y-2">
                  <Label htmlFor="add_source_url">Source URL *</Label>
                  <Input
                    id="add_source_url"
                    value={addFormData.source_url}
                    onChange={(e) => setAddFormData({ ...addFormData, source_url: e.target.value })}
                    placeholder="file:///C:/path/to/data.csv or https://example.com/data.csv"
                  />
                  <p className="text-xs text-muted-foreground">
                    File URL format (e.g., file:///C:/Users/...) or HTTP URL
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add_storage_path">Storage Path</Label>
                  <Input
                    id="add_storage_path"
                    value={addFormData.storage_path}
                    onChange={(e) => setAddFormData({ ...addFormData, storage_path: e.target.value })}
                    placeholder="C:\\path\\to\\data.csv"
                  />
                  <p className="text-xs text-muted-foreground">
                    File system path (e.g., C:\\Users\\...)
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="add_base_url">Base URL *</Label>
                <Input
                  id="add_base_url"
                  value={addFormData.base_url}
                  onChange={(e) => setAddFormData({ ...addFormData, base_url: e.target.value })}
                  placeholder="https://api.example.com"
                />
              </div>
            )}

            {/* API Version */}
            <div className="space-y-2">
              <Label htmlFor="add_api_version">API Version (Optional)</Label>
              <Input
                id="add_api_version"
                value={addFormData.api_version}
                onChange={(e) => setAddFormData({ ...addFormData, api_version: e.target.value })}
                placeholder="v1, v3, etc."
              />
            </div>

            {/* Refresh Interval */}
            <div className="space-y-2">
              <Label htmlFor="add_refresh_interval">Refresh Interval (Minutes)</Label>
              <Input
                id="add_refresh_interval"
                type="number"
                min="1"
                max="1440"
                value={addFormData.refresh_interval_minutes}
                onChange={(e) => setAddFormData({ ...addFormData, refresh_interval_minutes: parseInt(e.target.value) || 15 })}
                placeholder="15"
              />
              <p className="text-xs text-muted-foreground">
                How often the provider should fetch new data (1-1440 minutes)
              </p>
            </div>

            {/* Weather-specific options */}
            {addFormData.category === 'weather' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">Weather Options</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="add_language">Language</Label>
                  <Select
                    value={addFormData.language}
                    onValueChange={(value) => setAddFormData({ ...addFormData, language: value })}
                  >
                    <SelectTrigger id="add_language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="es">Spanish</SelectItem>
                      <SelectItem value="fr">French</SelectItem>
                      <SelectItem value="de">German</SelectItem>
                      <SelectItem value="it">Italian</SelectItem>
                      <SelectItem value="pt">Portuguese</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add_units">Temperature Units</Label>
                  <Select
                    value={addFormData.units}
                    onValueChange={(value) => setAddFormData({ ...addFormData, units: value })}
                  >
                    <SelectTrigger id="add_units">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="metric">Celsius (°C)</SelectItem>
                      <SelectItem value="imperial">Fahrenheit (°F)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* School Closings-specific options */}
            {addFormData.category === 'school_closings' && (
              <div className="space-y-4 p-4 border rounded-lg">
                <h3 className="font-semibold">School Closings Configuration</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="add_endpoint">API Endpoint</Label>
                  <Input
                    id="add_endpoint"
                    value={addFormData.endpoint}
                    onChange={(e) => setAddFormData({ ...addFormData, endpoint: e.target.value })}
                    placeholder="/GetClosings?sOrganizationName=&sRegionId=42&sZoneId="
                  />
                  <p className="text-xs text-muted-foreground">
                    The API endpoint path with query parameters
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add_region_id">Region ID</Label>
                  <Input
                    id="add_region_id"
                    value={addFormData.region_id}
                    onChange={(e) => setAddFormData({ ...addFormData, region_id: e.target.value })}
                    placeholder="42"
                  />
                  <p className="text-xs text-muted-foreground">
                    The region identifier for school closings data
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="add_sample_url">Sample URL (Optional)</Label>
                  <Input
                    id="add_sample_url"
                    value={addFormData.sample_url}
                    onChange={(e) => setAddFormData({ ...addFormData, sample_url: e.target.value })}
                    placeholder="https://example.com/sample.xml"
                  />
                  <p className="text-xs text-muted-foreground">
                    Optional URL to a sample data file for testing
                  </p>
                </div>
              </div>
            )}

            {/* Note about Sports leagues */}
            {addFormData.category === 'sports' && (
              <div className="p-4 border rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">
                  <strong>Note:</strong> You can configure league selections after creating the provider by editing it.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={adding}
            >
              Cancel
            </Button>
            <Button
              onClick={handleAdd}
              disabled={adding}
            >
              {adding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Provider
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!providerToDelete} onOpenChange={(open) => !open && setProviderToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="w-5 h-5" />
              Danger! Are you sure?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the provider{" "}
              <span className="font-semibold text-foreground">"{providerToDelete?.name}"</span>?
              <br />
              <br />
              This action cannot be undone. This will permanently delete the provider
              and all its configuration.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Provider
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}