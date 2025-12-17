import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { toast } from "sonner@2.0.3";
import { Search, Plus, TrendingUp, Coins, Loader2, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";

interface CryptoSearchProps {
  onCryptoAdded?: () => void;
  buttonText?: string;
}

interface CryptoSearchResult {
  id: string;
  symbol: string;
  name: string;
  image: string;
  current_price: number;
  market_cap: number;
  market_cap_rank: number;
  price_change_percentage_24h: number;
}

export function CryptoSearch({
  onCryptoAdded,
  buttonText = "Add Crypto"
}: CryptoSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<CryptoSearchResult[]>([]);
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
    if (searchTerm.length < 2) {
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
      // First, get the CoinGecko provider ID from the public view
      const listResponse = await fetch(
        getRestUrl('data_providers_public?select=id,name,is_active&category=eq.finance&type=eq.coingecko'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
            apikey: getSupabaseAnonKey(),
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch CoinGecko provider: ${listResponse.status}`);
      }

      const providers = await listResponse.json();
      
      if (providers.length === 0) {
        setProviderConfigured(false);
        toast.error('CoinGecko provider not found. Please configure it in Data Feeds.');
        return;
      }

      const provider = providers[0];

      // Use secure RPC to get full provider details with credentials
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
        throw new Error(`Failed to get provider details: ${rpcResponse.status}`);
      }

      const details = await rpcResponse.json();
      
      if (details && details.length > 0) {
        const providerData = details[0];
        const hasApiKey = providerData.api_key && providerData.api_key.trim() !== '';
        const isActive = providerData.is_active;
        
        setProviderConfigured(hasApiKey && isActive);
        
        if (!hasApiKey) {
          toast.error('CoinGecko API key not configured. Please add your API key in Data Feeds.');
        } else if (!isActive) {
          toast.error('CoinGecko provider is disabled. Please enable it in Data Feeds.');
        }
        
        console.log('🔍 CoinGecko Provider Check:', {
          name: providerData.name,
          isActive,
          hasApiKey,
          configured: hasApiKey && isActive
        });
      } else {
        setProviderConfigured(false);
        toast.error('Unable to verify CoinGecko provider configuration.');
      }
    } catch (error) {
      console.error('Error checking CoinGecko provider:', error);
      setProviderConfigured(false);
      toast.error('Failed to verify CoinGecko provider. Please check Data Feeds.');
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
      toast.error('CoinGecko provider not configured. Please set up your API key in Data Feeds.');
      return;
    }

    setIsSearching(true);
    setHasSearched(true);

    try {
      const response = await fetch(
        getEdgeFunctionUrl('finance_dashboard/search/crypto?q=${encodeURIComponent(searchTerm)}'),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        if (errorData.code === 'COINGECKO_CREDENTIALS_MISSING') {
          toast.error('CoinGecko API credentials not configured. Please set up your credentials in the Finance Dashboard provider settings.');
          setSearchResults([]);
          return;
        }
        
        throw new Error(errorData.message || 'Failed to search cryptocurrencies');
      }

      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Error searching cryptocurrencies:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to search cryptocurrencies');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleAddCrypto = async (crypto: CryptoSearchResult) => {
    // Prevent adding if provider not configured
    if (providerConfigured === false) {
      toast.error('CoinGecko provider not configured. Please set up your API key in Data Feeds.');
      return;
    }

    setIsAdding(crypto.id);

    try {
      console.log(`🪙 [CryptoSearch] Adding crypto to finance_dashboard:`, {
        cgId: crypto.id,
        name: crypto.name,
        symbol: crypto.symbol.toUpperCase()
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
            symbol: crypto.symbol.toUpperCase(),
            name: crypto.name,
            type: 'CRYPTO',
            source: 'coingecko',
            source_id: crypto.id,
            logo_url: crypto.image,
            price: crypto.current_price,
            change_1d_pct: crypto.price_change_percentage_24h,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        console.error(`❌ [CryptoSearch] Add crypto failed:`, {
          status: response.status,
          statusText: response.statusText,
          code: errorData.code,
          error: errorData.error || errorData.message
        });

        // Handle specific error codes
        if (errorData.code === 'CRYPTO_ALREADY_EXISTS') {
          toast.error(`${crypto.name} is already in your watchlist`);
          return;
        }
        
        if (errorData.code === 'COINGECKO_CREDENTIALS_MISSING' || errorData.code === 'COINGECKO_NOT_CONFIGURED') {
          toast.error('CoinGecko provider not configured. Please set up your API key in Data Feeds.');
          return;
        }

        if (errorData.code === 'CRYPTO_NOT_FOUND') {
          toast.error(`Cryptocurrency not found on CoinGecko`);
          return;
        }
        
        throw new Error(errorData.error || errorData.message || 'Failed to add cryptocurrency');
      }

      const result = await response.json();
      
      console.log(`✅ [CryptoSearch] Successfully added crypto to finance_dashboard:`, {
        name: crypto.name,
        symbol: crypto.symbol.toUpperCase(),
        type: 'CRYPTO'
      });

      toast.success(`Added ${crypto.name} (${crypto.symbol.toUpperCase()}) to watchlist`);
      
      // Keep dialog open, but clear search to allow adding more cryptos
      setSearchTerm("");
      setSearchResults([]);
      setHasSearched(false);
      
      // Notify parent to refresh data
      if (onCryptoAdded) {
        onCryptoAdded();
      }
    } catch (error) {
      console.error('❌ [CryptoSearch] Error adding cryptocurrency:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to add cryptocurrency');
    } finally {
      setIsAdding(null);
    }
  };

  const getTypeIcon = () => {
    return <Coins className="w-4 h-4" />;
  };

  const formatPrice = (price: number | undefined) => {
    if (price === undefined || price === null) {
      return 'N/A';
    }
    if (price < 0.01) {
      return `${price.toFixed(6)}`;
    } else if (price < 1) {
      return `${price.toFixed(4)}`;
    }
    return `${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatMarketCap = (marketCap: number | undefined) => {
    if (marketCap === undefined || marketCap === null) {
      return 'N/A';
    }
    if (marketCap >= 1e12) {
      return `${(marketCap / 1e12).toFixed(2)}T`;
    } else if (marketCap >= 1e9) {
      return `${(marketCap / 1e9).toFixed(2)}B`;
    } else if (marketCap >= 1e6) {
      return `${(marketCap / 1e6).toFixed(2)}M`;
    }
    return `${marketCap.toLocaleString()}`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          {buttonText}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="w-5 h-5" />
            Search & Add Cryptocurrency
          </DialogTitle>
          <DialogDescription>
            Search for cryptocurrencies via CoinGecko and add them to your watchlist.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Provider Status */}
          {checkingProvider ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              Checking CoinGecko provider...
            </div>
          ) : providerConfigured === false ? (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md p-3">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>CoinGecko provider not configured. Please set up your API key in Data Feeds.</span>
            </div>
          ) : providerConfigured === true ? (
            <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-500">
              <CheckCircle2 className="w-4 h-4" />
              CoinGecko provider configured
            </div>
          ) : null}

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search cryptocurrencies (e.g., Bitcoin, Ethereum, BTC, ETH...)"
              className="pl-9"
              disabled={providerConfigured === false || checkingProvider}
            />
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {providerConfigured === false ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>CoinGecko Provider Not Configured</p>
                <p className="text-sm mt-1">Please configure your CoinGecko API key in Data Feeds to search for cryptocurrencies</p>
              </div>
            ) : isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : hasSearched && searchResults.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Coins className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>No cryptocurrencies found</p>
                <p className="text-sm mt-1">Try a different search term</p>
              </div>
            ) : !hasSearched ? (
              <div className="text-center py-8 text-muted-foreground">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Start typing to search</p>
                <p className="text-sm mt-1">Search by name or symbol (e.g., Bitcoin, BTC)</p>
              </div>
            ) : null}

            {!isSearching && searchResults.map((crypto) => (
              <Card key={crypto.id} className="hover:border-primary transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      {/* Crypto Icon */}
                      <div className="flex-shrink-0">
                        {crypto.image ? (
                          <img 
                            src={crypto.image} 
                            alt={crypto.name}
                            className="w-10 h-10 rounded-full"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Coins className="w-5 h-5 text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{crypto.name}</span>
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            {getTypeIcon()}
                            {crypto.symbol.toUpperCase()}
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <DollarSign className="w-3 h-3" />
                            <span>{formatPrice(crypto.current_price)}</span>
                          </div>
                          {crypto.market_cap_rank && (
                            <div>
                              Rank #{crypto.market_cap_rank}
                            </div>
                          )}
                          <div>
                            MCap: {formatMarketCap(crypto.market_cap)}
                          </div>
                        </div>

                        {crypto.price_change_percentage_24h !== undefined && (
                          <div className="mt-1">
                            <span className={`text-sm flex items-center gap-1 ${
                              crypto.price_change_percentage_24h >= 0 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              <TrendingUp className={`w-3 h-3 ${
                                crypto.price_change_percentage_24h < 0 ? 'rotate-180' : ''
                              }`} />
                              {crypto.price_change_percentage_24h >= 0 ? '+' : ''}
                              {crypto.price_change_percentage_24h.toFixed(2)}% (24h)
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Add Button */}
                    <Button
                      size="sm"
                      onClick={() => handleAddCrypto(crypto)}
                      disabled={isAdding === crypto.id}
                    >
                      {isAdding === crypto.id ? (
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