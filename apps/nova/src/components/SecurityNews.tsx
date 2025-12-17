import React, { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { toast } from "sonner@2.0.3";
import { Newspaper, ExternalLink, Clock, Loader2 } from "lucide-react";

interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface SecurityNewsProps {
  symbol: string;
  name: string;
}

// Mock news API function
const mockNewsLookup = async (symbol: string): Promise<NewsItem[]> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 1200));
  
  const mockNews: Record<string, NewsItem[]> = {
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
        headline: 'EU Regulators Scrutinize Meta\'s Data Practices',
        summary: 'European Union privacy regulators are investigating Meta\'s compliance with GDPR regulations, potentially leading to new restrictions.',
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
        summary: 'Apple\'s mixed reality headset sees strong initial demand despite $3,499 price point, signaling potential new revenue stream.',
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
        summary: 'App Store, iCloud, and subscription services contribute to Apple\'s most profitable quarter for services division.',
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
        summary: 'Spot Bitcoin ETFs attract significant institutional investment, with BlackRock\'s IBIT leading inflows among approved funds.',
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

  // Default news for unknown symbols
  const defaultNews: NewsItem[] = [
    {
      id: 'default1',
      headline: `${symbol} Shows Market Resilience Amid Economic Uncertainty`,
      summary: 'The security continues to attract investor attention as market participants navigate changing economic conditions and sector dynamics.',
      source: 'Market News',
      publishedAt: '2024-02-07T12:00:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: 'default2',
      headline: `Analysts Update Price Targets for ${symbol}`,
      summary: 'Wall Street analysts revise their recommendations and price targets based on recent performance metrics and industry trends.',
      source: 'Financial Wire',
      publishedAt: '2024-02-06T14:30:00Z',
      url: '#',
      sentiment: 'neutral'
    },
    {
      id: 'default3',
      headline: `${symbol} Trading Volume Increases on Market Activity`,
      summary: 'Higher than average trading volume reflects increased investor interest and market participation in the security.',
      source: 'Trading Desk',
      publishedAt: '2024-02-05T11:15:00Z',
      url: '#',
      sentiment: 'neutral'
    }
  ];

  return mockNews[symbol] || defaultNews;
};

// Component for rendering news content without dialog wrapper
export function SecurityNewsContent({ symbol, name }: SecurityNewsProps) {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchNews = async () => {
    setIsLoading(true);
    try {
      const newsData = await mockNewsLookup(symbol);
      setNews(newsData);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Failed to load news');
      setNews([]);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    fetchNews();
  }, [symbol]);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <div className="space-y-4 max-h-[60vh] overflow-y-auto">
      {isLoading ? (
        // Loading skeletons
        Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
                <Skeleton className="h-5 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </div>
            </CardContent>
          </Card>
        ))
      ) : (
        // News items
        news.map((item) => (
          <Card key={item.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">
                      {item.source}
                    </Badge>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${getSentimentColor(item.sentiment)}`}
                    >
                      {item.sentiment}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3" />
                    {formatTime(item.publishedAt)}
                  </div>
                </div>
                
                <h3 className="font-semibold leading-tight">
                  {item.headline}
                </h3>
                
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {item.summary}
                </p>
                
                <div className="flex justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="gap-1 h-7 px-2 text-xs"
                    onClick={() => window.open(item.url, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                    Read More
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      
      {!isLoading && news.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p>No recent news available</p>
        </div>
      )}
    </div>
  );
}

export function SecurityNews({ symbol, name }: SecurityNewsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchNews = async () => {
    if (hasLoaded) return; // Don't refetch if already loaded
    
    setIsLoading(true);
    try {
      const newsData = await mockNewsLookup(symbol);
      setNews(newsData);
      setHasLoaded(true);
    } catch (error) {
      console.error('Failed to fetch news:', error);
      toast.error('Failed to load news');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && !hasLoaded) {
      fetchNews();
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="gap-1 h-7 px-2 text-xs"
        >
          <Newspaper className="w-3 h-3" />
          News
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Latest News: {symbol}
          </DialogTitle>
          <DialogDescription>
            Recent headlines and market news for {name}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 overflow-y-auto">
          {isLoading ? (
            // Loading skeletons
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-4 w-16" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                    <Skeleton className="h-5 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // News items
            news.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          {item.source}
                        </Badge>
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${getSentimentColor(item.sentiment)}`}
                        >
                          {item.sentiment}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatTime(item.publishedAt)}
                      </div>
                    </div>
                    
                    <h3 className="font-semibold leading-tight">
                      {item.headline}
                    </h3>
                    
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.summary}
                    </p>
                    
                    <div className="flex justify-end">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="gap-1 h-7 px-2 text-xs"
                        onClick={() => window.open(item.url, '_blank')}
                      >
                        <ExternalLink className="w-3 h-3" />
                        Read More
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
          
          {!isLoading && news.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No recent news available</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}