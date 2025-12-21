import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { TrendingUp, TrendingDown, Coins, Trash2, Loader2, DollarSign, BarChart3 } from "lucide-react";
import { toast } from "sonner@2.0.3";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { StockNameEdit } from "./StockNameEdit";

interface CryptoData {
  id: string;
  cgId: string;
  symbol: string;
  name: string;
  customName?: string | null;
  image: string;
  currentPrice: number;
  priceChange24h: number;
  priceChangePercentage24h: number;
  priceChangePercentage7d?: number;
  priceChangePercentage30d?: number;
  marketCap: number;
  marketCapRank: number;
  totalVolume: number;
  high24h: number;
  low24h: number;
  ath?: number;
  athDate?: string;
  atl?: number;
  atlDate?: string;
  lastUpdated: string;
}

interface CryptoCardProps {
  crypto: CryptoData;
  onDelete?: () => void;
  onUpdate?: (updatedCrypto: CryptoData) => void;
}

export function CryptoCard({ crypto, onDelete, onUpdate }: CryptoCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleCustomNameSave = async (customName: string | null) => {
    try {
      const response = await fetch(
        getEdgeFunctionUrl(`finance_dashboard/crypto/${crypto.cgId}/custom-name`),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
          body: JSON.stringify({ customName }),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to save custom name');
      }

      // Update the crypto object locally
      if (onUpdate) {
        onUpdate({
          ...crypto,
          customName: customName,
        });
      }
    } catch (error) {
      console.error('Error saving custom name:', error);
      throw error;
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove ${crypto.name} from your watchlist?`)) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch(
        getEdgeFunctionUrl(`finance_dashboard/crypto/${crypto.cgId}`),
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to remove cryptocurrency');
      }

      toast.success(`${crypto.name} removed`);
      if (onDelete) {
        onDelete();
      }
    } catch (error) {
      console.error('Error removing cryptocurrency:', error);
      toast.error('Failed to remove cryptocurrency');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (price: number) => {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    }
    return `$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatLargeNumber = (num: number) => {
    if (num >= 1e12) {
      return `$${(num / 1e12).toFixed(2)}T`;
    } else if (num >= 1e9) {
      return `$${(num / 1e9).toFixed(2)}B`;
    } else if (num >= 1e6) {
      return `$${(num / 1e6).toFixed(2)}M`;
    }
    return `$${num.toLocaleString()}`;
  };

  const isPositive = crypto.priceChangePercentage24h >= 0;

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            {crypto.image ? (
              <img 
                src={crypto.image} 
                alt={crypto.name}
                className="w-10 h-10 rounded-full flex-shrink-0"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <Coins className="w-5 h-5 text-muted-foreground" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg">
                <StockNameEdit
                  symbol={crypto.symbol}
                  originalName={crypto.name}
                  customName={crypto.customName || null}
                  type="CRYPTO"
                  onUpdate={(newCustomName) => {
                    crypto.customName = newCustomName;
                  }}
                />
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {crypto.symbol.toUpperCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Rank #{crypto.marketCapRank}
                </span>
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-shrink-0"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price Section */}
        <div>
          <div className="flex items-baseline gap-2 mb-2">
            <span className="text-2xl font-semibold">
              {formatPrice(crypto.currentPrice)}
            </span>
          </div>
          <div className={`flex items-center gap-1 text-sm ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {isPositive ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span className="font-medium">
              {isPositive ? '+' : ''}{crypto.priceChangePercentage24h.toFixed(2)}%
            </span>
            <span className="text-muted-foreground">
              ({isPositive ? '+' : ''}{formatPrice(crypto.priceChange24h)})
            </span>
          </div>
        </div>

        {/* Market Stats */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-muted-foreground mb-1">Market Cap</div>
            <div className="font-medium">{formatLargeNumber(crypto.marketCap)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">Volume (24h)</div>
            <div className="font-medium">{formatLargeNumber(crypto.totalVolume)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">24h High</div>
            <div className="font-medium">{formatPrice(crypto.high24h)}</div>
          </div>
          <div>
            <div className="text-muted-foreground mb-1">24h Low</div>
            <div className="font-medium">{formatPrice(crypto.low24h)}</div>
          </div>
        </div>

        {/* Additional Time Periods */}
        {(crypto.priceChangePercentage7d !== undefined || crypto.priceChangePercentage30d !== undefined) && (
          <div className="pt-3 border-t">
            <div className="flex gap-4 text-sm">
              {crypto.priceChangePercentage7d !== undefined && (
                <div>
                  <span className="text-muted-foreground">7d: </span>
                  <span className={crypto.priceChangePercentage7d >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {crypto.priceChangePercentage7d >= 0 ? '+' : ''}
                    {crypto.priceChangePercentage7d.toFixed(2)}%
                  </span>
                </div>
              )}
              {crypto.priceChangePercentage30d !== undefined && (
                <div>
                  <span className="text-muted-foreground">30d: </span>
                  <span className={crypto.priceChangePercentage30d >= 0 ? 'text-green-600' : 'text-red-600'}>
                    {crypto.priceChangePercentage30d >= 0 ? '+' : ''}
                    {crypto.priceChangePercentage30d.toFixed(2)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* All-Time High/Low */}
        {(crypto.ath !== undefined || crypto.atl !== undefined) && (
          <div className="pt-3 border-t text-xs">
            {crypto.ath !== undefined && (
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">All-Time High:</span>
                <span className="font-medium">{formatPrice(crypto.ath)}</span>
              </div>
            )}
            {crypto.atl !== undefined && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">All-Time Low:</span>
                <span className="font-medium">{formatPrice(crypto.atl)}</span>
              </div>
            )}
          </div>
        )}

        {/* Last Updated */}
        <div className="pt-2 border-t text-xs text-muted-foreground">
          Last updated: {new Date(crypto.lastUpdated).toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}