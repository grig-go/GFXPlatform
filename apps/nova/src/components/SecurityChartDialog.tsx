import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { Loader2, TrendingUp, TrendingDown, Activity, BarChart3, Calendar } from "lucide-react";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";

interface SecurityChartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  symbol: string;
  name: string;
  type: string;
}

type TimeResolution = "1d" | "1w" | "1m" | "1y";

interface ChartBar {
  t: string;
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
  timestamp: number;
  rsi?: number;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(data: ChartBar[], period: number = 14): ChartBar[] {
  if (data.length < period + 1) return data;

  const result = [...data];
  
  for (let i = period; i < data.length; i++) {
    let gains = 0;
    let losses = 0;
    
    for (let j = i - period; j < i; j++) {
      const change = data[j + 1].c - data[j].c;
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) {
      result[i].rsi = 100;
    } else {
      const rs = avgGain / avgLoss;
      result[i].rsi = 100 - (100 / (1 + rs));
    }
  }
  
  return result;
}

export function SecurityChartDialog({ open, onOpenChange, symbol, name, type }: SecurityChartDialogProps) {
  const [resolution, setResolution] = useState<TimeResolution>("1d");
  const [chartData, setChartData] = useState<ChartBar[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchChartData(resolution);
    }
  }, [open, resolution, symbol]);

  const fetchChartData = async (res: TimeResolution) => {
    try {
      setLoading(true);
      setError(null);

      console.log(`🔍 Fetching chart data for ${symbol} with resolution ${res}...`);

      const response = await fetch(
        getEdgeFunctionUrl(`finance_dashboard/chart/${symbol}?resolution=${res}`),
        {
          headers: {
            Authorization: `Bearer ${getSupabaseAnonKey()}`,
          },
        }
      );

      console.log(`📡 Response status: ${response.status}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("❌ Error response:", errorData);
        throw new Error(errorData.detail || errorData.error || `Failed to fetch chart data: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("📊 Chart data received:", data);

      if (!data.ok || !data.bars || data.bars.length === 0) {
        throw new Error(data.error || "No chart data available for this symbol");
      }

      // Transform data for recharts
      const transformedData = data.bars.map((bar: any) => ({
        ...bar,
        timestamp: new Date(bar.t).getTime(),
      }));

      // Calculate RSI
      const dataWithRSI = calculateRSI(transformedData);

      console.log(`✅ Transformed ${dataWithRSI.length} bars for charting with RSI`);
      setChartData(dataWithRSI);
    } catch (err) {
      console.error("❌ Error fetching chart data:", err);
      const errorMessage = err instanceof Error ? err.message : "Failed to load chart";
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const formatXAxis = (timestamp: number) => {
    const date = new Date(timestamp);
    
    if (resolution === "1d") {
      return date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
    } else if (resolution === "1w") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else if (resolution === "1m") {
      return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } else {
      return date.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
    }
  };

  const formatPrice = (value: number) => {
    if (value < 1) {
      return `$${value.toFixed(4)}`;
    }
    return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatVolume = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toFixed(0);
  };

  const calculatePriceChange = () => {
    if (chartData.length < 2) return { change: 0, changePercent: 0, isPositive: true };
    
    const firstPrice = chartData[0].o;
    const lastPrice = chartData[chartData.length - 1].c;
    const change = lastPrice - firstPrice;
    const changePercent = (change / firstPrice) * 100;
    
    return {
      change,
      changePercent,
      isPositive: change >= 0,
    };
  };

  const calculateStats = () => {
    if (chartData.length === 0) return { high: 0, low: 0, avgVolume: 0 };
    
    const high = Math.max(...chartData.map(bar => bar.h));
    const low = Math.min(...chartData.map(bar => bar.l));
    const avgVolume = chartData.reduce((sum, bar) => sum + bar.v, 0) / chartData.length;
    
    return { high, low, avgVolume };
  };

  const priceStats = calculatePriceChange();
  const stats = calculateStats();

  const resolutionLabels: Record<TimeResolution, string> = {
    "1d": "1 Day",
    "1w": "1 Week",
    "1m": "1 Month",
    "1y": "1 Year",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-none max-h-[95vh] overflow-hidden p-0" style={{ maxWidth: '1400px', width: '90vw' }}>
        {/* Header Section */}
        <div className="px-6 pt-6 pb-4 border-b bg-gradient-to-r from-background to-muted/20">
          <div className="flex items-start justify-between mb-4">
            <div>
              <DialogTitle className="text-3xl font-bold mb-1">{symbol}</DialogTitle>
              <DialogDescription className="text-muted-foreground">{name}</DialogDescription>
            </div>
            <Badge variant="outline" className="text-sm px-3 py-1">
              {type}
            </Badge>
          </div>

          {/* Price and Change Stats */}
          {!loading && !error && chartData.length > 0 && (
            <div className="flex items-end gap-6">
              <div>
                <div className="text-4xl font-bold">
                  {formatPrice(chartData[chartData.length - 1].c)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">Current Price</div>
              </div>
              <div className={`flex items-center gap-2 pb-1 ${priceStats.isPositive ? "text-green-600" : "text-red-600"}`}>
                {priceStats.isPositive ? <TrendingUp className="w-5 h-5" /> : <TrendingDown className="w-5 h-5" />}
                <div>
                  <div className="font-bold text-lg">
                    {priceStats.isPositive ? "+" : ""}
                    {formatPrice(Math.abs(priceStats.change))}
                  </div>
                  <div className="text-sm">
                    {priceStats.isPositive ? "+" : ""}
                    {priceStats.changePercent.toFixed(2)}%
                  </div>
                </div>
              </div>
              <div className="flex-1" />
              
              {/* Quick Stats */}
              <div className="grid grid-cols-3 gap-6 pb-1">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">High</div>
                  <div className="font-semibold">{formatPrice(stats.high)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Low</div>
                  <div className="font-semibold">{formatPrice(stats.low)}</div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Avg Volume</div>
                  <div className="font-semibold">{(stats.avgVolume / 1000000).toFixed(2)}M</div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Time Resolution Buttons */}
        <div className="px-6 py-4 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground mr-2" />
            {(["1d", "1w", "1m", "1y"] as TimeResolution[]).map((res) => (
              <Button
                key={res}
                variant={resolution === res ? "default" : "ghost"}
                size="sm"
                onClick={() => setResolution(res)}
                disabled={loading}
                className={resolution === res ? "shadow-md" : ""}
              >
                {resolutionLabels[res]}
              </Button>
            ))}
          </div>
        </div>

        {/* Chart Section */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(95vh-250px)]">
          {loading && (
            <div className="h-[600px] flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Loading chart data...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="h-[600px] flex items-center justify-center bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900">
              <div className="text-center max-w-md px-6">
                <Activity className="w-12 h-12 text-red-500 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Failed to fetch chart data</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button onClick={() => fetchChartData(resolution)} variant="outline">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length === 0 && (
            <div className="h-[600px] flex items-center justify-center bg-muted/20 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No chart data available for this symbol</p>
              </div>
            </div>
          )}

          {!loading && !error && chartData.length > 0 && (
            <div className="space-y-4">
              {/* Price Chart */}
              <div className="bg-gradient-to-b from-background to-muted/10 rounded-lg p-4 border shadow-sm">
                <div className="text-xs text-muted-foreground mb-2 px-2">Price</div>
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart 
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop
                          offset="5%"
                          stopColor={priceStats.isPositive ? "#10b981" : "#ef4444"}
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor={priceStats.isPositive ? "#10b981" : "#ef4444"}
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="currentColor" 
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                      dy={8}
                    />
                    <YAxis
                      tickFormatter={formatPrice}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={['dataMin', 'dataMax']}
                      width={70}
                      orientation="right"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background/98 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
                              <p className="text-xs text-muted-foreground mb-2 font-medium">
                                {new Date(data.t).toLocaleString("en-US", {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="space-y-1.5">
                                <div className="flex justify-between gap-6">
                                  <span className="text-xs text-muted-foreground">Open</span>
                                  <span className="text-xs font-bold">{formatPrice(data.o)}</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-xs text-muted-foreground">High</span>
                                  <span className="text-xs font-bold text-green-600">{formatPrice(data.h)}</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-xs text-muted-foreground">Low</span>
                                  <span className="text-xs font-bold text-red-600">{formatPrice(data.l)}</span>
                                </div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-xs text-muted-foreground">Close</span>
                                  <span className="text-xs font-bold">{formatPrice(data.c)}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="c"
                      stroke={priceStats.isPositive ? "#10b981" : "#ef4444"}
                      strokeWidth={2}
                      fill="url(#colorPrice)"
                      animationDuration={300}
                      dot={false}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Volume Chart */}
              <div className="bg-gradient-to-b from-background to-muted/10 rounded-lg p-4 border shadow-sm">
                <div className="text-xs text-muted-foreground mb-2 px-2">Volume</div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart 
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="currentColor" 
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                      dy={8}
                    />
                    <YAxis
                      tickFormatter={formatVolume}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={50}
                      orientation="right"
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background/98 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                                {new Date(data.t).toLocaleString("en-US", {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex justify-between gap-4">
                                <span className="text-xs text-muted-foreground">Volume</span>
                                <span className="text-xs font-bold">{data.v.toLocaleString()}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Bar 
                      dataKey="v" 
                      fill="#6366f1"
                      opacity={0.7}
                      radius={[2, 2, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* RSI Chart */}
              <div className="bg-gradient-to-b from-background to-muted/10 rounded-lg p-4 border shadow-sm">
                <div className="text-xs text-muted-foreground mb-2 px-2">RSI (14)</div>
                <ResponsiveContainer width="100%" height={120}>
                  <ComposedChart 
                    data={chartData}
                    margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#8b5cf6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid 
                      strokeDasharray="3 3" 
                      stroke="currentColor" 
                      strokeOpacity={0.1}
                      vertical={false}
                    />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatXAxis}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: 'currentColor', strokeOpacity: 0.2 }}
                      dy={8}
                    />
                    <YAxis
                      domain={[0, 100]}
                      stroke="currentColor"
                      strokeOpacity={0.3}
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      width={40}
                      orientation="right"
                      ticks={[0, 30, 50, 70, 100]}
                    />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-background/98 backdrop-blur-sm border border-border rounded-lg p-3 shadow-xl">
                              <p className="text-xs text-muted-foreground mb-1.5 font-medium">
                                {new Date(data.t).toLocaleString("en-US", {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                              <div className="flex justify-between gap-4">
                                <span className="text-xs text-muted-foreground">RSI</span>
                                <span className="text-xs font-bold">{data.rsi?.toFixed(2) || 'N/A'}</span>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Reference lines for overbought/oversold */}
                    <line x1="0" y1="70" x2="100%" y2="70" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
                    <line x1="0" y1="30" x2="100%" y2="30" stroke="#10b981" strokeWidth={1} strokeDasharray="4 4" opacity={0.3} />
                    <Area
                      type="monotone"
                      dataKey="rsi"
                      stroke="#8b5cf6"
                      strokeWidth={2}
                      fill="url(#rsiGradient)"
                      animationDuration={300}
                      dot={false}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}