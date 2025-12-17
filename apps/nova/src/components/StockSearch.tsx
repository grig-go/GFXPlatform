import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner@2.0.3";
import { Search, Plus, TrendingUp, Loader2, DollarSign, AlertCircle, CheckCircle2, Building2 } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

interface StockSearchProps {
  onStockAdded?: () => void;
  buttonText?: string;
}

interface StockSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: 'EQUITY' | 'ETF' | 'INDEX';
}

export function StockSearch({
  onStockAdded,
  buttonText = "Add Stock / ETF"
}: StockSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<StockSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isAdding, setIsAdding] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState<boolean | null>(null);
  const [checkingProvider, setCheckingProvider] = useState(false);

  // Check provider configuration when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkProviderConfiguration();
    }
  }, [isOpen]);

  // Auto-search when user types (debounced)
  useEffect(() => {
    if (searchTerm.length < 1) {
      setSearchResults([]);
      setHasSearched(false);
      return;
    }

    const timer = setTimeout(() => {
      handleSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const checkProviderConfiguration = async () => {
    setCheckingProvider(true);
    
    try {
      console.log('📊 [StockSearch] Checking Alpaca provider via RPC...');
      
      // First, get the Alpaca provider ID from the public view
      const listResponse = await fetch(
        getRestUrl('data_providers_public?select=id,name,is_active&category=eq.finance&type=eq.alpaca'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch Alpaca provider: ${listResponse.status}`);
      }

      const providers = await listResponse.json();
      
      if (providers.length === 0) {
        setProviderConfigured(false);
        toast.error('Alpaca provider not found. Please configure it in Data Feeds.');
        setCheckingProvider(false);
        return;
      }

      const provider = providers[0];
      
      // Use secure RPC to get provider details with credentials
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
        console.error(`❌ [StockSearch] RPC failed: ${rpcResponse.status}`);
        throw new Error(`Failed to get provider details: ${rpcResponse.status}`);
      }

      const details = await rpcResponse.json();
      console.log('📊 [StockSearch] RPC response:', details);
      
      if (details && details.length > 0) {
        const providerData = details[0];
        const hasApiKey = providerData.api_key && providerData.api_key.trim() !== '';
        const hasApiSecret = providerData.api_secret && providerData.api_secret.trim() !== '';
        const isActive = providerData.is_active;
        
        setProviderConfigured(hasApiKey && hasApiSecret && isActive);
        
        console.log('✅ [StockSearch] Provider check complete:', {
          name: providerData.name,
          isActive,
          hasApiKey,
          hasApiSecret,
          configured: hasApiKey && hasApiSecret && isActive
        });
        
        if (!hasApiKey || !hasApiSecret) {
          toast.error('Alpaca API credentials not configured. Please add your API key and secret in Data Feeds.');
        } else if (!isActive) {
          toast.error('Alpaca provider is disabled. Please enable it in Data Feeds.');
        }
      } else {
        console.warn('⚠️ [StockSearch] No provider data returned from RPC');
        setProviderConfigured(false);
        toast.error('Alpaca provider not found. Please configure it in Data Feeds.');
      }
    } catch (error) {
      console.error('❌ [StockSearch] Error checking provider:', error);
      setProviderConfigured(false);
      toast.error('Failed to verify Alpaca provider. Please check Data Feeds.');
    } finally {
      setCheckingProvider(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      return;
    }

    // Don't search if provider is not configured
    if (providerConfigured === false) {
      toast.error('Alpaca provider not configured. Please set up your API credentials in Data Feeds.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      console.log(`🔍 [StockSearch] Searching for: "${searchTerm}"`);
      
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/search/stocks?q=${encodeURIComponent(searchTerm)}'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.error(`❌ [StockSearch] Search failed:`, {
          status: response.status,
          statusText: response.statusText,
          code: errorData.code,
          error: errorData.error || errorData.message
        });
        
        if (errorData.code === 'ALPACA_CREDENTIALS_MISSING' || errorData.code === 'ALPACA_NOT_CONFIGURED') {
          toast.error('Alpaca API credentials not configured. Please set up your credentials in Data Feeds.');
          setSearchResults([]);
          return;
        }
        
        throw new Error(errorData.message || errorData.error || 'Failed to search stocks');
      }

      const data = await response.json();
      console.log(`✅ [StockSearch] Found ${data.results?.length || 0} results for "${searchTerm}"`);
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('❌ [StockSearch] Error searching stocks:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search stocks');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddStock = async (stock: StockSearchResult) => {
    // Prevent adding if provider not configured
    if (providerConfigured === false) {
      toast.error('Alpaca provider not configured. Please set up your API credentials in Data Feeds.');
      return;
    }

    setIsAdding(stock.symbol);

    try {
      console.log(`📈 [StockSearch] Adding ${stock.type} to finance_dashboard:`, {
        symbol: stock.symbol,
        name: stock.name,
        type: stock.type,
        exchange: stock.exchange
      });
      
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/stocks'),
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            symbol: stock.symbol,
            name: stock.name,
            type: stock.type,
            exchange: stock.exchange,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.error(`❌ [StockSearch] Add ${stock.type} failed:`, {
          status: response.status,
          statusText: response.statusText,
          code: errorData.code,
          error: errorData.error || errorData.message
        });

        // Handle specific error codes
        if (errorData.code === 'STOCK_EXISTS') {
          toast.error(`${stock.symbol} is already in your watchlist`);
          return;
        }
        
        if (errorData.code === 'ALPACA_CREDENTIALS_MISSING' || errorData.code === 'ALPACA_NOT_CONFIGURED') {
          toast.error('Alpaca provider not configured. Please set up your API credentials in Data Feeds.');
          return;
        }

        if (errorData.code === 'ASSET_NOT_FOUND') {
          toast.error(`${stock.symbol} not found on Alpaca`);
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to add stock');
      }

      const result = await response.json();
      
      console.log(`✅ [StockSearch] Successfully added ${stock.type} to finance_dashboard:`, {
        symbol: stock.symbol,
        name: stock.name,
        type: stock.type
      });

      const typeName = stock.type === 'ETF' ? 'ETF' : stock.type === 'INDEX' ? 'Index' : 'Stock';
      toast.success(`Added ${stock.symbol} (${typeName}) to watchlist`);
      
      // Close dialog and reset
      setIsOpen(false);
      setSearchTerm("");
      setSearchResults([]);
      setHasSearched(false);
      
      // Notify parent to refresh data
      if (onStockAdded) {
        onStockAdded();
      }
    } catch (error) {
      console.error('❌ [StockSearch] Error adding stock:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add stock');
    } finally {
      setIsAdding(null);
    }
  };

  const getTypeIcon = (type: string) => {
    if (type === 'ETF') return <Building2 className="w-4 h-4" />;
    if (type === 'INDEX') return <TrendingUp className="w-4 h-4" />;
    return <DollarSign className="w-4 h-4" />;
  };

  const getTypeBadgeColor = (type: string) => {
    if (type === 'ETF') return 'bg-purple-100 text-purple-700 border-purple-300';
    if (type === 'INDEX') return 'bg-blue-100 text-blue-700 border-blue-300';
    return 'bg-green-100 text-green-700 border-green-300';
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Stocks
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Search & Add Stock / ETF
          </DialogTitle>
          <DialogDescription>
            Search for stocks and ETFs via Alpaca and add them to your watchlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Provider Status */}
          {checkingProvider ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking Alpaca provider...
            </div>
          ) : providerConfigured === false ? (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>Alpaca provider not configured. Please set up your API credentials in Data Feeds.</span>
            </div>
          ) : providerConfigured === true ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              Alpaca provider configured
            </div>
          ) : null}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search stocks and ETFs (e.g., AAPL, SPY, TSLA...)"
              className="pl-9"
              disabled={providerConfigured === false || checkingProvider}
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {providerConfigured === false ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Alpaca Provider Not Configured</p>
                <p className="text-sm mt-1">Please configure your Alpaca API credentials in Data Feeds to search for stocks</p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No stocks found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Start typing to search</p>
                <p className="text-sm mt-1">Search by symbol or company name (e.g., AAPL, Apple)</p>
              </div>
            ) : null}

            {!isSearching && searchResults.map((stock) => (
              <Card key={stock.symbol} className="hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Stock Icon */}
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                          {getTypeIcon(stock.type)}
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{stock.symbol}</span>
                          <Badge variant="outline" className={`flex items-center gap-1 text-xs ${getTypeBadgeColor(stock.type)}`}>
                            {getTypeIcon(stock.type)}
                            {stock.type}
                          </Badge>
                        </div>
                        
                        <div className="text-sm text-muted-foreground truncate">
                          {stock.name}
                        </div>

                        <div className="text-xs text-muted-foreground mt-1">
                          {stock.exchange}
                        </div>
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      size="sm"
                      onClick={() => handleAddStock(stock)}
                      disabled={isAdding === stock.symbol}
                    >
                      {isAdding === stock.symbol ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}