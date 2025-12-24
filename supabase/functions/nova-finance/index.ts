// Nova Finance API - Direct endpoint for finance dashboard data with filtering
// URL: /nova/finance?type=all&change=all&symbol=all
// type: all | stocks | crypto
// change: all | up | down
// symbol: all | specific symbol (BTC, AAPL, etc.)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock news data for securities (same as SecurityNews.tsx)
const mockNewsData: Record<string, Array<{
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}>> = {
  'META': [
    {
      id: '1',
      headline: 'Meta Reports Strong Q4 Earnings, Revenue Beats Expectations',
      summary: 'Meta Platforms exceeded analyst expectations with quarterly revenue of $40.1 billion, driven by strong advertising performance and user growth across its platforms.',
      source: 'MarketWatch',
      publishedAt: '2024-02-07T14:30:00Z',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: '2',
      headline: 'Meta Invests $20B in AI Infrastructure for 2024',
      summary: 'The company announces significant capital expenditure increases to support AI research and metaverse development initiatives.',
      source: 'TechCrunch',
      publishedAt: '2024-02-06T09:15:00Z',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: '3',
      headline: "EU Regulators Scrutinize Meta's Data Practices",
      summary: "European Union privacy regulators are investigating Meta's compliance with GDPR regulations, potentially leading to new restrictions.",
      source: 'Reuters',
      publishedAt: '2024-02-05T16:45:00Z',
      url: '#',
      sentiment: 'negative'
    }
  ],
  'AAPL': [
    {
      id: '4',
      headline: 'Apple Vision Pro Pre-Orders Exceed Initial Expectations',
      summary: "Apple's mixed reality headset sees strong initial demand despite $3,499 price point, signaling potential new revenue stream.",
      source: 'Bloomberg',
      publishedAt: '2024-02-07T11:20:00Z',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: '5',
      headline: 'iPhone Sales Decline in China Market Continues',
      summary: 'Apple faces ongoing challenges in China as local competitors gain market share, impacting overall iPhone revenue projections.',
      source: 'Financial Times',
      publishedAt: '2024-02-06T13:30:00Z',
      url: '#',
      sentiment: 'negative'
    },
    {
      id: '6',
      headline: 'Apple Services Revenue Reaches New Record High',
      summary: "App Store, iCloud, and subscription services contribute to Apple's most profitable quarter for services division.",
      source: 'CNBC',
      publishedAt: '2024-02-05T10:00:00Z',
      url: '#',
      sentiment: 'positive'
    }
  ],
  'BTC': [
    {
      id: '7',
      headline: 'Bitcoin ETF Inflows Surpass $1 Billion in First Month',
      summary: "Spot Bitcoin ETFs attract significant institutional investment, with BlackRock's IBIT leading inflows among approved funds.",
      source: 'CoinDesk',
      publishedAt: '2024-02-07T08:45:00Z',
      url: '#',
      sentiment: 'positive'
    },
    {
      id: '8',
      headline: 'Bitcoin Mining Difficulty Reaches All-Time High',
      summary: 'Network security strengthens as mining difficulty adjustment reflects increased computational power securing the Bitcoin blockchain.',
      source: 'The Block',
      publishedAt: '2024-02-06T15:20:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: '9',
      headline: 'Regulatory Clarity Boosts Bitcoin Adoption Among Banks',
      summary: 'Major financial institutions increase Bitcoin exposure following clearer regulatory guidance from federal banking agencies.',
      source: 'Wall Street Journal',
      publishedAt: '2024-02-05T12:10:00Z',
      url: '#',
      sentiment: 'positive'
    }
  ]
};

// Generate default news for unknown symbols
function getDefaultNews(symbol: string): Array<{
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}> {
  return [
    {
      id: `${symbol}-default1`,
      headline: `${symbol} Shows Market Resilience Amid Economic Uncertainty`,
      summary: 'The security continues to attract investor attention as market participants navigate changing economic conditions and sector dynamics.',
      source: 'Market News',
      publishedAt: '2024-02-07T12:00:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: `${symbol}-default2`,
      headline: `Analysts Update Price Targets for ${symbol}`,
      summary: 'Wall Street analysts revise their recommendations and price targets based on recent performance metrics and industry trends.',
      source: 'Financial Wire',
      publishedAt: '2024-02-06T14:30:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: `${symbol}-default3`,
      headline: `${symbol} Trading Volume Increases on Market Activity`,
      summary: 'Higher than average trading volume reflects increased investor interest and market participation in the security.',
      source: 'Trading Desk',
      publishedAt: '2024-02-05T11:15:00Z',
      url: '#',
      sentiment: 'neutral'
    }
  ];
}

// Get news for a symbol
function getNewsForSymbol(symbol: string) {
  return mockNewsData[symbol] || getDefaultNews(symbol);
}

// Transform finance data for API response
function transformFinanceData(
  securities: any[],
  type: string,
  change: string,
  symbol: string
): any {
  const now = new Date().toISOString();

  let filteredSecurities = securities;

  console.log(`Type filter: ${type}, Change filter: ${change}, Symbol filter: ${symbol}`);
  console.log(`Total securities before filter: ${securities.length}`);

  // Filter by type
  if (type && type !== 'all') {
    if (type === 'stocks') {
      // Stocks includes EQUITY, INDEX, and ETF
      filteredSecurities = filteredSecurities.filter(
        (sec) => ['EQUITY', 'INDEX', 'ETF', 'us_equity'].includes(sec.type?.toUpperCase() || sec.type)
      );
    } else if (type === 'crypto') {
      filteredSecurities = filteredSecurities.filter(
        (sec) => sec.type?.toUpperCase() === 'CRYPTO'
      );
    }
    console.log(`After type filter (${type}): ${filteredSecurities.length}`);
  }

  // Filter by change direction
  if (change && change !== 'all') {
    if (change === 'up') {
      filteredSecurities = filteredSecurities.filter(
        (sec) => (sec.change_1d_pct || 0) > 0
      );
    } else if (change === 'down') {
      filteredSecurities = filteredSecurities.filter(
        (sec) => (sec.change_1d_pct || 0) < 0
      );
    }
    console.log(`After change filter (${change}): ${filteredSecurities.length}`);
  }

  // Filter by symbol
  if (symbol && symbol !== 'all') {
    const upperSymbol = symbol.toUpperCase();
    filteredSecurities = filteredSecurities.filter(
      (sec) => sec.symbol?.toUpperCase() === upperSymbol
    );
    console.log(`After symbol filter (${symbol}): ${filteredSecurities.length}`);
  }

  // Transform securities to include SecurityCard-compatible data and news
  const transformedSecurities = filteredSecurities.map(sec => {
    const securitySymbol = sec.symbol || '';
    const changeValue = sec.change_1d_pct || 0;

    return {
      id: sec.symbol,
      symbol: sec.symbol,
      name: sec.custom_name || sec.name,
      originalName: sec.name,
      hasCustomName: !!sec.custom_name,
      type: sec.type?.toUpperCase() || 'EQUITY',

      // Price data (matches SecurityCard display)
      price: {
        value: sec.price,
        formatted: sec.price !== null && sec.price !== undefined
          ? `$${sec.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: sec.type === 'CRYPTO' && sec.price < 1 ? 4 : 2 })}`
          : 'N/A',
        currency: sec.currency || 'USD',
      },

      // Change data (matches SecurityCard display)
      change: {
        absolute: {
          value: sec.change_1d || 0,
          formatted: sec.change_1d !== null && sec.change_1d !== undefined
            ? `${sec.change_1d >= 0 ? '+' : ''}${sec.change_1d.toFixed(2)}`
            : 'N/A',
        },
        percent: {
          value: changeValue,
          formatted: changeValue !== null && changeValue !== undefined
            ? `${changeValue >= 0 ? '+' : ''}${changeValue.toFixed(2)}%`
            : 'N/A',
        },
        direction: changeValue > 0 ? 'up' : changeValue < 0 ? 'down' : 'unchanged',
      },

      // Performance metrics (matches SecurityCard display)
      performance: {
        week: sec.change_1w_pct !== null && sec.change_1w_pct !== undefined ? {
          value: sec.change_1w_pct,
          formatted: `${sec.change_1w_pct >= 0 ? '+' : ''}${sec.change_1w_pct.toFixed(2)}%`,
        } : null,
        year: sec.change_1y_pct !== null && sec.change_1y_pct !== undefined ? {
          value: sec.change_1y_pct,
          formatted: `${sec.change_1y_pct >= 0 ? '+' : ''}${sec.change_1y_pct.toFixed(2)}%`,
        } : null,
      },

      // 52-week range (matches SecurityCard display)
      yearRange: {
        high: sec.year_high !== null && sec.year_high !== undefined ? {
          value: sec.year_high,
          formatted: `$${sec.year_high.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        } : null,
        low: sec.year_low !== null && sec.year_low !== undefined ? {
          value: sec.year_low,
          formatted: `$${sec.year_low.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
        } : null,
      },

      // Additional metadata
      exchange: sec.exchange,
      volume: sec.volume,
      logoUrl: sec.logo_url,
      lastUpdate: sec.last_update || sec.updated_at,

      // News for this security
      news: getNewsForSymbol(securitySymbol),
    };
  });

  // Sort by symbol
  transformedSecurities.sort((a, b) => {
    return (a.symbol || '').localeCompare(b.symbol || '');
  });

  // Group by type for organized display
  const groupedSecurities = {
    stocks: transformedSecurities.filter(s => ['EQUITY', 'INDEX', 'US_EQUITY'].includes(s.type)),
    etfs: transformedSecurities.filter(s => s.type === 'ETF'),
    crypto: transformedSecurities.filter(s => s.type === 'CRYPTO'),
  };

  // Summary statistics
  const summary = {
    total: transformedSecurities.length,
    gainers: transformedSecurities.filter(s => s.change.direction === 'up').length,
    losers: transformedSecurities.filter(s => s.change.direction === 'down').length,
    unchanged: transformedSecurities.filter(s => s.change.direction === 'unchanged').length,
    byType: {
      stocks: groupedSecurities.stocks.length,
      etfs: groupedSecurities.etfs.length,
      crypto: groupedSecurities.crypto.length,
    },
  };

  return {
    filters: {
      type: type || 'all',
      change: change || 'all',
      symbol: symbol || 'all',
    },
    lastUpdated: now,
    summary,
    securities: transformedSecurities,
    grouped: groupedSecurities,
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const typeParam = url.searchParams.get('type');
    const changeParam = url.searchParams.get('change');
    const symbolParam = url.searchParams.get('symbol');

    console.log('Finance API Request:', {
      type: typeParam,
      change: changeParam,
      symbol: symbolParam
    });

    const type = typeParam || 'all';
    const change = changeParam || 'all';
    const symbol = symbolParam || 'all';

    // Validate type parameter
    const validTypes = ['all', 'stocks', 'crypto'];
    if (!validTypes.includes(type)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid type parameter',
          details: `Type must be one of: ${validTypes.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate change parameter
    const validChanges = ['all', 'up', 'down'];
    if (!validChanges.includes(change)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid change parameter',
          details: `Change must be one of: ${validChanges.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Query f_stocks table directly
    const { data: securities, error: dbError } = await supabase
      .from("f_stocks")
      .select("*")
      .order("symbol");

    if (dbError) {
      console.error("Database query failed:", dbError);
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch finance data',
          details: dbError.message
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully fetched ${securities.length} securities`);

    // Transform the data to user-friendly format with filtering
    const transformedData = transformFinanceData(
      securities,
      type,
      change,
      symbol
    );

    return new Response(
      JSON.stringify(transformedData),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error)
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
