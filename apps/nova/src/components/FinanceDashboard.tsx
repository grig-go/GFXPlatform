import { useState, useMemo, useEffect } from "react";
import { FinanceSecurityWithSnapshot, MarketSummary, isFieldOverridden } from "../types/finance";
import { SecurityCard } from "./SecurityCard";
import { FinanceFilters } from "./FinanceFilters";
import { SecuritySearch } from "./SecuritySearch";
import { FinanceAIInsights } from "./FinanceAIInsights";
import { Badge } from "./ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { TrendingUp, TrendingDown, Minus, Building2, Database, Brain, Rss, CheckCircle2, AlertCircle, Eye, Loader2, RefreshCw, X } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl, getAccessToken } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { motion } from "framer-motion";
import { useAuth } from "../contexts/AuthContext";

interface FinanceDashboardProps {
  securities: FinanceSecurityWithSnapshot[];
  onUpdateSecurity: (security: FinanceSecurityWithSnapshot) => void;
  onAddSecurity: (security: FinanceSecurityWithSnapshot) => void;
  onDeleteSecurity: (securityId: string) => void;
  lastUpdated: string;
  onNavigateToFeeds?: () => void;
  onNavigateToProviders?: () => void;
}

interface DataProvider {
  id: string;
  name: string;
  type: string;
  category: string;
  description: string;
  configured: boolean;
  apiKeyConfigured: boolean;
  apiSecretConfigured?: boolean;
  status: string;
  config: {
    apiKey?: string | null;
    baseUrl?: string;
    mode?: string;
    autoRefresh?: boolean;
    refreshInterval?: number;
  };
}

interface DataProviderStats {
  totalProviders: number;
  activeProviders: number;
  stocksTracked: number;
  cryptosTracked: number;
}

export function FinanceDashboard({ securities, onUpdateSecurity, onAddSecurity, onDeleteSecurity, lastUpdated, onNavigateToFeeds }: FinanceDashboardProps) {
  // Get effective organization for impersonation support
  const { effectiveOrganization } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [changeFilter, setChangeFilter] = useState<"all" | "up" | "down">("all");
  const [showAIInsights, setShowAIInsights] = useState(false);
  const [preselectedSecurityId, setPreselectedSecurityId] = useState<string | undefined>(undefined);
  const [providers, setProviders] = useState<DataProvider[]>([]);
  const [providerStats, setProviderStats] = useState<DataProviderStats | null>(null);
  
  // Backend data state
  const [backendSecurities, setBackendSecurities] = useState<FinanceSecurityWithSnapshot[]>([]);
  const [loading, setLoading] = useState(true);
  const [backendLoaded, setBackendLoaded] = useState(false); // Track if backend has loaded (even with 0 results)
  const [error, setError] = useState<string | null>(null);
  const [backendOverrideCount, setBackendOverrideCount] = useState(0);
  
  // Debug dialog state
  const [debugDialogOpen, setDebugDialogOpen] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [loadingDebug, setLoadingDebug] = useState(false);
  const [revealedCredentials, setRevealedCredentials] = useState<any>(null);
  const [loadingReveal, setLoadingReveal] = useState(false);
  
  // Individual provider dialog state
  const [providerDialogOpen, setProviderDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<DataProvider | null>(null);
  const [providerCredentials, setProviderCredentials] = useState<any>(null);
  const [loadingProviderCredentials, setLoadingProviderCredentials] = useState(false);

  // Overrides dialog state
  const [overridesDialogOpen, setOverridesDialogOpen] = useState(false);
  const [overrides, setOverrides] = useState<Array<{ symbol: string; name: string; custom_name: string; type: string }>>([]);
  const [loadingOverrides, setLoadingOverrides] = useState(false);
  const [removingOverride, setRemovingOverride] = useState<string | null>(null);

  // Fetch stocks and crypto from backend (refetch when impersonation changes)
  useEffect(() => {
    fetchBackendData();
  }, [effectiveOrganization?.id]);

  // Fetch data provider info from backend
  useEffect(() => {
    fetchDataProviders();
  }, []);

  const fetchBackendData = async (skipRefresh = false) => {
    try {
      console.log('📡 Fetching backend data from finance_dashboard...');
      setLoading(true);
      setError(null);

      // Fetch from finance_dashboard edge function with user's access token for RLS filtering
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Add effective org header for superuser impersonation support
      if (effectiveOrganization?.id) {
        headers['X-Effective-Org-Id'] = effectiveOrganization.id;
      }
      const response = await fetch(getEdgeFunctionUrl('finance_dashboard/stocks'), {
        headers,
      });
      
      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      // Transform to FinanceSecurityWithSnapshot format
      const securities: FinanceSecurityWithSnapshot[] = (data.stocks || []).map((item: any) => {
        const security = {
          id: item.symbol,
          symbol: item.symbol,
          name: { value: item.custom_name || item.name, original: item.name, isOverridden: !!item.custom_name },
          type: item.type?.toUpperCase() || 'EQUITY',
          status: { value: 'active', original: 'active', isOverridden: false },
          currency: item.currency || 'USD',
          uniqueKey: item.symbol,
          exchangeId: item.exchange ? parseInt(item.exchange, 10) : undefined,
          createdAt: item.created_at || new Date().toISOString(),
          updatedAt: item.updated_at || new Date().toISOString(),
        };

        const snapshot = {
          key: item.symbol,
          securityId: item.symbol,
          asof: item.updated_at || new Date().toISOString(),
          last: { value: item.price || 0, original: item.price || 0, isOverridden: false },
          changeAbs: { value: item.change_1d || 0, original: item.change_1d || 0, isOverridden: false },
          changePct: { value: item.change_1d_pct || 0, original: item.change_1d_pct || 0, isOverridden: false },
          change1wPct: item.change_1w_pct !== null && item.change_1w_pct !== undefined 
            ? { value: item.change_1w_pct, original: item.change_1w_pct, isOverridden: false } 
            : undefined,
          change1yPct: item.change_1y_pct !== null && item.change_1y_pct !== undefined 
            ? { value: item.change_1y_pct, original: item.change_1y_pct, isOverridden: false } 
            : undefined,
          yearHigh: item.year_high !== null && item.year_high !== undefined 
            ? { value: item.year_high, original: item.year_high, isOverridden: false } 
            : undefined,
          yearLow: item.year_low !== null && item.year_low !== undefined 
            ? { value: item.year_low, original: item.year_low, isOverridden: false } 
            : undefined,
        };

        // Add crypto profile if this is a crypto asset with logo_url
        const result: FinanceSecurityWithSnapshot = {
          security,
          snapshot,
        };

        if (item.type?.toUpperCase() === 'CRYPTO' && item.logo_url) {
          result.cryptoProfile = {
            securityId: item.symbol,
            cgSymbol: item.symbol.toLowerCase(),
            cgRank: item.market_cap_rank || 0,
            cgImage: item.logo_url,
            cgCategories: [],
          };
        }

        return result;
      });
      
      console.log(`📊 Loaded ${securities.length} securities from finance_dashboard`);
      console.log('📊 Securities data:', securities.map(s => ({ symbol: s.security.symbol, name: s.security.name.value, type: s.security.type })));
      setBackendSecurities(securities);
      setBackendLoaded(true); // Mark as loaded even if 0 results (RLS filtering)

      // Count total overrides from backend (securities with custom names)
      const overrideCount = securities.filter(sec => sec.security.name.isOverridden).length;
      setBackendOverrideCount(overrideCount);

      console.log(`📊 Total overrides: ${overrideCount}`);
      
      // If not skipping refresh, auto-refresh prices after initial load
      if (!skipRefresh && securities.length > 0) {
        console.log('🔄 Auto-refreshing prices after initial load...');
        setTimeout(() => handleRefreshPrices(true), 500);
      }
      
    } catch (err) {
      console.error('Error fetching backend data:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch data';
      
      // Detect credentials error
      if (errorMessage === 'CREDENTIALS_MISSING' || errorMessage.includes('credentials')) {
        setError('CREDENTIALS_MISSING');
        toast.error('Alpaca API credentials not configured', {
          description: 'Please set up credentials in the data_providers table',
        });
      } else {
        setError(errorMessage);
        toast.error('Failed to load finance data');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshPrices = async (silent = false) => {
    try {
      setLoading(true);
      setError(null);

      if (!silent) {
        toast.info('Fetching latest prices from APIs...');
      }

      // Call the refresh endpoint to get fresh data from Alpaca/CoinGecko
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
      };
      // Add effective org header for superuser impersonation support
      if (effectiveOrganization?.id) {
        headers['X-Effective-Org-Id'] = effectiveOrganization.id;
      }
      const response = await fetch(getEdgeFunctionUrl('finance_dashboard/stocks/refresh'), {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const json = await response.json();
      
      if (!json.ok) {
        throw new Error(json.error || 'Failed to refresh prices');
      }

      // Show success message with stats
      const { updated, failed } = json;
      if (!silent) {
        if (failed > 0) {
          toast.warning(`Refreshed ${updated} securities, ${failed} failed`);
        } else {
          toast.success(`Successfully refreshed ${updated} securities`);
        }
      }

      // Fetch the updated data (skip auto-refresh to avoid loop)
      await fetchBackendData(true);
    } catch (err) {
      console.error('Error refreshing prices:', err);
      if (!silent) {
        toast.error(err instanceof Error ? err.message : 'Failed to refresh prices');
      }
      setError(err instanceof Error ? err.message : 'Failed to refresh prices');
    } finally {
      setLoading(false);
    }
  };

  const fetchDataProviders = async () => {
    try {
      // Fetch providers from public view (masked credentials)
      const token = await getAccessToken();
      const response = await fetch(
        getRestUrl('data_providers_public?select=*&category=eq.finance'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        // Map database fields to component interface
        const financeProviders = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          category: p.category,
          description: p.description,
          configured: p.api_key ? true : false,
          apiKeyConfigured: p.api_key ? true : false,
          apiSecretConfigured: p.api_secret ? true : false,
          status: p.is_active ? 'active' : 'inactive',
          isActive: p.is_active,
          config: p.config || {},
        }));
        setProviders(financeProviders);
        
        // Calculate finance-specific stats
        const financeStats = {
          totalProviders: financeProviders.length,
          activeProviders: financeProviders.filter((p: DataProvider) => p.isActive).length,
          stocksTracked: 0,
          cryptosTracked: 0,
        };
        setProviderStats(financeStats);
      }
    } catch (error) {
      console.error('Error fetching data providers:', error);
    }
  };

  const handleDebugBackendData = async () => {
    setLoadingDebug(true);
    setDebugDialogOpen(true);
    setDebugData(null);
    
    try {
      // Step 1: Get provider list from public view (IDs only)
      const listResponse = await fetch(
        getRestUrl('data_providers_public?select=id&category=eq.finance'),
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
              apiSecretConfigured: p.api_secret ? true : false,
              apiKey: p.api_key, // UNMASKED via RPC
              apiSecret: p.api_secret, // UNMASKED via RPC
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
      
      // Format the debug data with UNMASKED credentials
      const formattedData = {
        totalProviders: providersWithDetails.length,
        providers: providersWithDetails,
        rawResponse: providersWithDetails, // Include full response for debugging
      };
      
      setDebugData(formattedData);
      console.log("🔍 Backend Finance Provider Debug Data (via RPC):", formattedData);
      toast.success(`Loaded ${providersWithDetails.length} finance provider(s) with unmasked credentials`);
    } catch (error) {
      console.error("Error fetching debug data:", error);
      setDebugData({ error: String(error) });
      toast.error("Failed to fetch debug data");
    } finally {
      setLoadingDebug(false);
    }
  };

  const handleRevealCredentials = async () => {
    setLoadingReveal(true);
    
    try {
      // Get all finance provider IDs first
      const listResponse = await fetch(
        getRestUrl('data_providers_public?select=id&category=eq.finance'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch provider list: ${listResponse.status}`);
      }

      const providerList = await listResponse.json();
      
      // Fetch full details for each provider using RPC
      const revealedProviders = [];
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
            revealedProviders.push(details[0]);
          }
        }
      }
      
      setRevealedCredentials(revealedProviders);
      toast.success("API keys revealed");
      console.log("🔓 Revealed Finance Provider Credentials:", revealedProviders);
    } catch (error) {
      console.error("Error revealing credentials:", error);
      toast.error("Failed to reveal credentials");
    } finally {
      setLoadingReveal(false);
    }
  };

  const handleOpenProviderDialog = async (provider: DataProvider) => {
    setSelectedProvider(provider);
    setProviderDialogOpen(true);
    setProviderCredentials(null);
    setLoadingProviderCredentials(true);
    
    try {
      // Fetch full provider details using secure RPC function
      const response = await fetch(
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

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data && data.length > 0) {
        const providerData = data[0];
        setProviderCredentials(providerData);
        console.log(`🔓 Revealed ${provider.name} Credentials:`, providerData);
      } else {
        throw new Error("No provider data returned");
      }
    } catch (error) {
      console.error("Error revealing provider credentials:", error);
      toast.error(`Failed to load ${provider.name} credentials`);
    } finally {
      setLoadingProviderCredentials(false);
    }
  };

  const handleOpenOverridesDialog = async () => {
    setOverridesDialogOpen(true);
    setLoadingOverrides(true);

    try {
      // Fetch all securities with custom names from finance_dashboard edge function
      const token = await getAccessToken();
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks/overrides/list'),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch overrides: ${response.statusText}`);
      }

      const data = await response.json();
      setOverrides(data.overrides || []);
      console.log(`📋 Loaded ${data.overrides?.length || 0} custom name overrides`);
    } catch (error) {
      console.error("Error fetching overrides:", error);
      toast.error("Failed to load overrides");
    } finally {
      setLoadingOverrides(false);
    }
  };

  const handleRemoveOverride = async (symbol: string, type: string) => {
    setRemovingOverride(symbol);
    
    try {
      await handleSaveCustomName(symbol, '', type);
      
      // Remove from local state
      setOverrides(prev => prev.filter(o => o.symbol !== symbol));
      
      toast.success(`Removed custom name for ${symbol}`);
      
      // Refresh backend data to update the main view
      await fetchBackendData();
    } catch (error) {
      console.error("Error removing override:", error);
      toast.error(`Failed to remove override for ${symbol}`);
    } finally {
      setRemovingOverride(null);
    }
  };

  const handleRemoveAllOverrides = async () => {
    if (overrides.length === 0) return;
    
    const confirmRemove = window.confirm(
      `Remove all ${overrides.length} custom name overrides? This action cannot be undone.`
    );
    
    if (!confirmRemove) return;
    
    setLoadingOverrides(true);
    
    try {
      let successCount = 0;
      let failCount = 0;
      
      for (const override of overrides) {
        try {
          await handleSaveCustomName(override.symbol, '', override.type);
          successCount++;
        } catch (error) {
          console.error(`Failed to remove override for ${override.symbol}:`, error);
          failCount++;
        }
      }
      
      setOverrides([]);
      
      if (failCount === 0) {
        toast.success(`Removed all ${successCount} custom name overrides`);
      } else {
        toast.warning(`Removed ${successCount} overrides, ${failCount} failed`);
      }
      
      // Refresh backend data to update the main view
      await fetchBackendData();
    } catch (error) {
      console.error("Error removing all overrides:", error);
      toast.error("Failed to remove all overrides");
    } finally {
      setLoadingOverrides(false);
    }
  };

  // Handler to save custom name to backend
  const handleSaveCustomName = async (symbol: string, customName: string, type: string) => {
    try {
      const url = getEdgeFunctionUrl(`finance_dashboard/stocks/${symbol}`);
      console.log(`📝 Saving custom name for ${symbol} (${type}):`, customName);
      console.log(`📡 Request URL:`, url);

      const body = {
        custom_name: customName || null  // null to clear
      };

      console.log(`📦 Request body:`, body);

      const token = await getAccessToken();
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      console.log(`📥 Response status:`, response.status, response.statusText);
      
      const json = await response.json().catch(() => ({}));
      console.log(`📥 Response JSON:`, json);
      
      if (!response.ok || !json.ok) {
        const msg = json?.error || `HTTP ${response.status}`;
        console.error(`❌ Error response:`, msg);
        throw new Error(`Failed to save custom name: ${msg}`);
      }

      console.log(`✅ Custom name saved successfully for ${symbol}`);
      
      // Refresh backend data to get updated custom_name
      await fetchBackendData();
    } catch (error) {
      console.error('❌ Error saving custom name:', error);
      throw error;
    }
  };

  // Handler to open AI Insights with a specific security preselected
  const handleShowAIInsightsForSecurity = (securityId: string) => {
    setPreselectedSecurityId(securityId);
    setShowAIInsights(true);
  };

  // Handler to close AI Insights and clear preselection
  const handleCloseAIInsights = () => {
    setPreselectedSecurityId(undefined);
  };

  // Use backend data instead of props - once backend has loaded, always use backend data
  // (even if empty, which means RLS is filtering out data for this org)
  const activeSecurities = backendLoaded ? backendSecurities : securities;
  
  const filteredSecurities = useMemo(() => {
    const filtered = activeSecurities.filter(item => {
      // Safety check: ensure item and item.security exist
      if (!item || !item.security) {
        console.warn('⚠️ Malformed security item:', item);
        return false;
      }
      
      const security = item.security;
      const snapshot = item.snapshot;
      
      // Search filter
      const searchMatch = searchTerm === "" || 
        security.name?.value?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (security.symbol && security.symbol.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (security.cgId && security.cgId.toLowerCase().includes(searchTerm.toLowerCase()));

      // Type filter
      const typeMatch = selectedTypes.length === 0 || selectedTypes.includes(security.type);

      // Change filter
      const changeMatch = changeFilter === "all" || 
        (changeFilter === "up" && snapshot?.changePct?.value > 0) ||
        (changeFilter === "down" && snapshot?.changePct?.value < 0);

      return searchMatch && typeMatch && changeMatch;
    });

    // Sort by symbol or name
    return filtered.sort((a, b) => {
      const aName = a.security.symbol || a.security.name?.value || '';
      const bName = b.security.symbol || b.security.name?.value || '';
      
      if (sortOrder === "asc") {
        return aName.localeCompare(bName);
      } else {
        return bName.localeCompare(aName);
      }
    });
  }, [activeSecurities, searchTerm, selectedTypes, sortOrder, changeFilter]);

  const marketSummary = useMemo(() => {
    const filtered = filteredSecurities;
    
    // Calculate override statistics
    const securitiesWithOverrides = filtered.filter(security => {
      if (!security?.security || !security?.snapshot) return false;
      
      return isFieldOverridden(security.security.name) ||
             isFieldOverridden(security.security.status) ||
             isFieldOverridden(security.snapshot.last) ||
             isFieldOverridden(security.snapshot.changeAbs) ||
             isFieldOverridden(security.snapshot.changePct) ||
             (security.analystRating && (
               isFieldOverridden(security.analystRating.rating) ||
               isFieldOverridden(security.analystRating.score) ||
               isFieldOverridden(security.analystRating.targetPrice)
             ));
    });

    const totalOverriddenFields = filtered.reduce((total, security) => {
      if (!security?.security || !security?.snapshot) return total;
      
      let fieldCount = 0;
      if (isFieldOverridden(security.security.name)) fieldCount++;
      if (isFieldOverridden(security.security.status)) fieldCount++;
      if (isFieldOverridden(security.snapshot.last)) fieldCount++;
      if (isFieldOverridden(security.snapshot.changeAbs)) fieldCount++;
      if (isFieldOverridden(security.snapshot.changePct)) fieldCount++;
      if (security.analystRating) {
        if (isFieldOverridden(security.analystRating.rating)) fieldCount++;
        if (isFieldOverridden(security.analystRating.score)) fieldCount++;
        if (isFieldOverridden(security.analystRating.targetPrice)) fieldCount++;
      }
      return total + fieldCount;
    }, 0);
    
    return {
      totalSecurities: filtered.length,
      gainers: filtered.filter(s => s?.snapshot?.changePct?.value > 0).length,
      losers: filtered.filter(s => s?.snapshot?.changePct?.value < 0).length,
      unchanged: filtered.filter(s => s?.snapshot?.changePct?.value === 0).length,
      cryptoCount: filtered.filter(s => s?.security?.type === 'CRYPTO').length,
      etfCount: filtered.filter(s => s?.security?.type === 'ETF').length,
      stocksAndIndicesCount: filtered.filter(s => s?.security?.type === 'INDEX' || s?.security?.type === 'EQUITY').length,
      securitiesWithOverrides: securitiesWithOverrides.length,
      totalOverriddenFields
    };
  }, [filteredSecurities]);

  // Group securities by type for organized display
  const groupedSecurities = useMemo(() => {
    const groups = {
      STOCKS_INDICES: filteredSecurities.filter(s => s?.security?.type === 'INDEX' || s?.security?.type === 'EQUITY'),
      ETF: filteredSecurities.filter(s => s?.security?.type === 'ETF'),
      CRYPTO: filteredSecurities.filter(s => s?.security?.type === 'CRYPTO'),
    };
    
    return Object.entries(groups).filter(([_, items]) => items.length > 0);
  }, [filteredSecurities]);

  const formatLastUpdated = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  // Get existing symbols to prevent duplicates
  const existingSymbols = useMemo(() => {
    return activeSecurities
      .filter(s => s?.security)
      .map(s => s.security.symbol)
      .filter((symbol): symbol is string => !!symbol);
  }, [activeSecurities]);

  // Show credentials error
  if (!loading && error === 'CREDENTIALS_MISSING') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-semibold flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-green-600" />
            Finance Dashboard
          </h1>
        </div>
        <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950 dark:border-amber-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-100">
              <AlertCircle className="w-5 h-5" />
              Alpaca API Credentials Not Configured
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-amber-900 dark:text-amber-100">
            <p>
              The Finance Dashboard requires Alpaca Markets API credentials to fetch stock data from the backend.
            </p>
            <div className="space-y-2">
              <p className="font-semibold">Quick Fix:</p>
              <ol className="list-decimal list-inside space-y-1 ml-4">
                <li>Open Supabase SQL Editor</li>
                <li>Run: <code className="bg-amber-100 dark:bg-amber-900 px-2 py-1 rounded text-sm">UPDATE data_providers SET api_key = 'PKOSFDGF5FUEN3AUWIIZ6B3TVB', api_secret = 'UeEvRxjcjV8LADoiXeinnk2aSL41EPT8sr5ZGbjW', is_active = true WHERE type = 'alpaca' AND category = 'finance';</code></li>
                <li>Click the Refresh button below</li>
              </ol>
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchBackendData} variant="default">
                <RefreshCw className="w-4 h-4 mr-2" />
                Retry Connection
              </Button>
              <Button onClick={handleDebugBackendData} variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                View Debug Info
              </Button>
            </div>
            <p className="text-sm">
              <strong>Note:</strong> See <code>/QUICK_FIX_FINANCE_CREDENTIALS.md</code> for detailed instructions.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 mb-1 text-[24px]">
              <TrendingUp className="w-6 h-6 text-green-600" />
              Finance Dashboard
            </h1>
            <p className="text-sm text-muted-foreground">
              Track and manage financial market data across stocks, indices, and cryptocurrencies
            </p>
          </div>
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleRefreshPrices(false)}
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Fetch Latest
              </Button>
              <Button
                onClick={handleDebugBackendData}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Eye className="w-4 h-4" />
                Debug
              </Button>
              <SecuritySearch 
                onAddSecurity={() => {
                  // Refetch backend data to show newly added security
                  console.log('🔄 Security added, refetching backend data...');
                  fetchBackendData();
                  // Also call parent callback if provided
                  if (onAddSecurity) onAddSecurity({} as any);
                }}
                existingSymbols={existingSymbols}
                filterType="EQUITY_INDEX"
                buttonText="Add Security / Index"
              />
              <SecuritySearch 
                onAddSecurity={() => {
                  // Refetch backend data to show newly added crypto
                  console.log('🔄 Crypto added, refetching backend data...');
                  fetchBackendData();
                  // Also call parent callback if provided
                  if (onAddSecurity) onAddSecurity({} as any);
                }}
                existingSymbols={existingSymbols}
                filterType="CRYPTO"
                buttonText="Add Crypto"
              />
            </div>
            <div className="text-sm text-muted-foreground">
              Last updated ({new Date(lastUpdated).toLocaleTimeString()})
            </div>
          </div>
        </div>

        {/* Market Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card className="overflow-hidden relative group hover:shadow-lg transition-all duration-300 h-full">
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="p-3 bg-green-100 dark:bg-green-900/20 rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <TrendingUp className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Securities</p>
                    <motion.p 
                      className="text-2xl font-semibold"
                      key={marketSummary.totalSecurities}
                      initial={{ scale: 1.2, color: "#10b981" }}
                      animate={{ scale: 1, color: "currentColor" }}
                      transition={{ duration: 0.5 }}
                    >
                      {marketSummary.totalSecurities}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">Stocks, ETFs & Crypto</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card 
              className={`cursor-pointer transition-all overflow-hidden relative group hover:shadow-lg h-full ${
                backendOverrideCount > 0 
                  ? 'hover:border-amber-600' 
                  : ''
              }`}
              onClick={handleOpenOverridesDialog}
            >
              {backendOverrideCount > 0 && (
                <motion.div
                  className="absolute inset-0 bg-amber-500/10"
                  animate={{
                    opacity: [0.3, 0.6, 0.3],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              )}
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className={`p-3 rounded-lg ${
                      backendOverrideCount > 0 
                        ? 'bg-amber-100 dark:bg-amber-900/20' 
                        : 'bg-gray-100 dark:bg-gray-900/20'
                    }`}
                    whileHover={{ scale: 1.1, rotate: -5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Database className={`w-6 h-6 ${
                      backendOverrideCount > 0 
                        ? 'text-amber-600 dark:text-amber-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`} />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Overrides</p>
                    <motion.p 
                      className="text-2xl font-semibold"
                      key={backendOverrideCount}
                      initial={{ scale: 1.2, color: backendOverrideCount > 0 ? "#f59e0b" : "currentColor" }}
                      animate={{ scale: 1, color: "currentColor" }}
                      transition={{ duration: 0.5 }}
                    >
                      {backendOverrideCount}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">
                      {backendOverrideCount > 0 ? 'Custom names set' : 'No changes made'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <FinanceAIInsights 
            securities={filteredSecurities} 
            compact={true} 
            onClick={() => setShowAIInsights(!showAIInsights)}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.4 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
          >
            <Card 
              className={`overflow-hidden relative group transition-all hover:shadow-lg h-full ${onNavigateToFeeds ? "cursor-pointer" : ""}`}
              onClick={onNavigateToFeeds}
            >
              <motion.div
                className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                initial={false}
              />
              <CardContent className="p-6 relative z-10">
                <div className="flex items-center gap-4">
                  <motion.div 
                    className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg"
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                  </motion.div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data Providers</p>
                    <motion.p 
                      className="text-2xl font-semibold"
                      key={`${providerStats?.activeProviders}-${providerStats?.totalProviders}`}
                      initial={{ scale: 1.2, color: "#a855f7" }}
                      animate={{ scale: 1, color: "currentColor" }}
                      transition={{ duration: 0.5 }}
                    >
                      {providerStats?.activeProviders || 0}/{providerStats?.totalProviders || 0}
                    </motion.p>
                    <p className="text-xs text-muted-foreground">
                      {providerStats?.activeProviders || 0} active
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      {/* Expanded AI Insights Section */}
      {showAIInsights && (
        <FinanceAIInsights 
          securities={filteredSecurities} 
          listView={true}
          preselectedSecurityId={preselectedSecurityId}
          onDialogClose={handleCloseAIInsights}
        />
      )}

      {/* Filters */}
      <FinanceFilters
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        selectedTypes={selectedTypes}
        onTypesChange={setSelectedTypes}
        securities={securities}
        sortOrder={sortOrder}
        onSortChange={setSortOrder}
        changeFilter={changeFilter}
        onChangeFilterChange={setChangeFilter}
      />

      {/* Securities by Type */}
      <div className="space-y-8">
        {groupedSecurities.map(([type, typeSecurities]) => (
          <div key={type} className="space-y-4">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">
                {type === 'STOCKS_INDICES' && 'Stocks & Indices'}
                {type === 'CRYPTO' && 'Cryptocurrency'}
                {type === 'ETF' && 'ETFs'}
              </h2>
              <Badge variant="secondary">
                {typeSecurities.length}
              </Badge>
            </div>
            
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {typeSecurities.map((security) => (
                <SecurityCard
                  key={security.security.id}
                  security={security}
                  onUpdate={onUpdateSecurity}
                  onDelete={onDeleteSecurity}
                  onSaveCustomName={handleSaveCustomName}
                  onShowAIInsights={handleShowAIInsightsForSecurity}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {filteredSecurities.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No securities match your current filters.</p>
        </div>
      )}

      {/* Debug Backend Data Dialog */}
      <Dialog open={debugDialogOpen} onOpenChange={setDebugDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🔍 Backend Finance Provider Debug</DialogTitle>
            <DialogDescription>
              Raw backend data showing finance data providers and their configurations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingDebug ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : debugData?.error ? (
              <div className="p-4 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-red-600 dark:text-red-400">
                  <strong>Error:</strong> {debugData.error}
                </p>
              </div>
            ) : debugData ? (
              <div className="space-y-4">
                {/* Summary */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Finance Providers:</span>
                        <strong>{debugData.totalProviders}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">All Providers (Total):</span>
                        <strong>{debugData.allProvidersCount}</strong>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Provider Details */}
                {debugData.providers && debugData.providers.length > 0 ? (
                  <div className="space-y-3">
                    {debugData.providers.map((provider: any, idx: number) => (
                      <Card key={provider.id || idx}>
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-sm">{provider.name}</CardTitle>
                            <div className="flex gap-2">
                              <Badge variant={provider.isActive ? "default" : "secondary"}>
                                {provider.isActive ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">{provider.status}</Badge>
                            </div>
                          </div>
                          <CardDescription className="text-xs">
                            {provider.description}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">ID:</span>{" "}
                              <code className="bg-muted px-2 py-0.5 rounded text-xs">{provider.id}</code>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Type:</span>{" "}
                              <Badge variant="outline">{provider.type}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Category:</span>{" "}
                              <Badge variant="outline">{provider.category}</Badge>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Configured:</span>{" "}
                              {provider.configured ? (
                                <CheckCircle2 className="w-4 h-4 inline text-green-600" />
                              ) : (
                                <AlertCircle className="w-4 h-4 inline text-amber-600" />
                              )}
                            </div>
                          </div>

                          {/* API Configuration */}
                          <div className="mt-4 space-y-2">
                            <div className="text-sm text-muted-foreground mb-2">🔑 API Configuration:</div>
                            <div className="space-y-1 text-xs">
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">API Key:</span>
                                {provider.apiKeyConfigured ? (
                                  <Badge variant="default" className="text-xs gap-1">
                                    <CheckCircle2 className="w-3 h-3" />
                                    Configured
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="text-xs gap-1">
                                    <AlertCircle className="w-3 h-3" />
                                    Not Set
                                  </Badge>
                                )}
                              </div>
                              {provider.apiSecretConfigured !== undefined && (
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">API Secret:</span>
                                  {provider.apiSecretConfigured ? (
                                    <Badge variant="default" className="text-xs gap-1">
                                      <CheckCircle2 className="w-3 h-3" />
                                      Configured
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="text-xs gap-1">
                                      <AlertCircle className="w-3 h-3" />
                                      Not Set
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              {/* Show unmasked credentials (now fetched via RPC) */}
                              {(provider.apiKey || provider.apiSecret) && (
                                <div className="mt-3 space-y-2 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded p-3">
                                  <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                    <Eye className="w-3 h-3" />
                                    <span className="font-semibold">Credentials (Unmasked via RPC)</span>
                                  </div>
                                  {provider.apiKey && (
                                    <div>
                                      <div className="text-muted-foreground mb-1">API Key:</div>
                                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded block break-all">
                                        {provider.apiKey}
                                      </code>
                                    </div>
                                  )}
                                  {provider.apiSecret && (
                                    <div>
                                      <div className="text-muted-foreground mb-1">API Secret:</div>
                                      <code className="bg-white dark:bg-gray-900 px-2 py-1 rounded block break-all">
                                        {provider.apiSecret}
                                      </code>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Config Details */}
                          {provider.config && Object.keys(provider.config).length > 0 && (
                            <div className="mt-4">
                              <div className="text-sm text-muted-foreground mb-2">⚙️ Configuration:</div>
                              <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                                {JSON.stringify(provider.config, null, 2)}
                              </pre>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No finance providers found
                    </CardContent>
                  </Card>
                )}

                {/* Raw Response */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">📦 Raw Backend Response</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <pre className="bg-muted p-3 rounded text-xs overflow-x-auto max-h-96">
                      {JSON.stringify(debugData.rawResponse, null, 2)}
                    </pre>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No data available
              </div>
            )}
          </div>
          <DialogFooter className="flex justify-end items-center gap-3">
            <div className="text-xs text-muted-foreground mr-auto">
              ✅ Credentials automatically unmasked via secure RPC function
            </div>
            <Button onClick={() => setDebugDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Individual Provider Dialog */}
      <Dialog open={providerDialogOpen} onOpenChange={setProviderDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              {selectedProvider?.name || 'Provider Details'}
            </DialogTitle>
            <DialogDescription>
              {selectedProvider?.description || 'Provider configuration and credentials'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {loadingProviderCredentials ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : selectedProvider ? (
              <div className="space-y-4">
                {/* Provider Status */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Status</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Type:</span>
                        <Badge variant="outline">{selectedProvider.type}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Category:</span>
                        <Badge variant="outline">{selectedProvider.category}</Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Status:</span>
                        <Badge variant={selectedProvider.status === 'active' ? 'default' : 'secondary'}>
                          {selectedProvider.status}
                        </Badge>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Configured:</span>
                        {selectedProvider.configured ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* API Configuration */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">🔑 API Configuration</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">API Key:</span>
                        {selectedProvider.apiKeyConfigured ? (
                          <Badge variant="default" className="text-xs gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            Configured
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Not Set
                          </Badge>
                        )}
                      </div>
                      {selectedProvider.apiSecretConfigured !== undefined && (
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">API Secret:</span>
                          {selectedProvider.apiSecretConfigured ? (
                            <Badge variant="default" className="text-xs gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Configured
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <AlertCircle className="w-3 h-3" />
                              Not Set
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Revealed Credentials */}
                    {providerCredentials && (
                      <div className="mt-4 space-y-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded p-3">
                        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 mb-2">
                          <Eye className="w-4 h-4" />
                          <span className="font-semibold">Credentials</span>
                        </div>
                        {providerCredentials.apiKey && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">API Key:</div>
                            <code className="bg-white dark:bg-gray-900 px-3 py-2 rounded block break-all text-xs">
                              {providerCredentials.apiKey}
                            </code>
                          </div>
                        )}
                        {providerCredentials.apiSecret && (
                          <div>
                            <div className="text-xs text-muted-foreground mb-1">API Secret:</div>
                            <code className="bg-white dark:bg-gray-900 px-3 py-2 rounded block break-all text-xs">
                              {providerCredentials.apiSecret}
                            </code>
                          </div>
                        )}
                        {!providerCredentials.apiKey && !providerCredentials.apiSecret && (
                          <div className="text-sm text-muted-foreground italic">
                            No credentials configured for this provider
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Configuration */}
                {selectedProvider.config && Object.keys(selectedProvider.config).length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">⚙️ Configuration</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-3 rounded text-xs overflow-x-auto">
                        {JSON.stringify(selectedProvider.config, null, 2)}
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No provider selected
              </div>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => {
              setProviderDialogOpen(false);
              setProviderCredentials(null);
              setSelectedProvider(null);
            }}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Custom Name Overrides Dialog */}
      <Dialog open={overridesDialogOpen} onOpenChange={setOverridesDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Database className="w-5 h-5 text-amber-600" />
              Custom Name Overrides
            </DialogTitle>
            <DialogDescription>
              Manage custom names for securities. Overrides replace the original security names.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {loadingOverrides ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : overrides.length === 0 ? (
              <div className="text-center py-12">
                <Database className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No custom name overrides found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Edit security names in cards to create overrides
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Summary Card */}
                <Card className="bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4 text-amber-600" />
                        <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">
                          {overrides.length} Custom Name{overrides.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <Button
                        onClick={handleRemoveAllOverrides}
                        variant="destructive"
                        size="sm"
                        disabled={loadingOverrides}
                      >
                        Remove All
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Overrides List */}
                {overrides.map((override) => (
                  <Card key={override.symbol} className="hover:border-amber-300 transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {override.symbol}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {override.type}
                            </Badge>
                          </div>
                          
                          <div className="space-y-1 text-sm">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground">Original:</span>
                              <span className="text-muted-foreground line-through">
                                {override.name}
                              </span>
                            </div>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs text-muted-foreground">Custom:</span>
                              <span className="font-semibold text-amber-700 dark:text-amber-400">
                                {override.custom_name}
                              </span>
                            </div>
                          </div>
                        </div>

                        <Button
                          onClick={() => handleRemoveOverride(override.symbol, override.type)}
                          variant="ghost"
                          size="sm"
                          disabled={removingOverride === override.symbol}
                          className="hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950/20"
                        >
                          {removingOverride === override.symbol ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <X className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button onClick={() => setOverridesDialogOpen(false)} variant="outline">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}