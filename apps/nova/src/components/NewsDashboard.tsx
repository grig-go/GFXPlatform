import { useState, useMemo, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
import { Label } from "./ui/label";
import { useNewsProviders } from "../utils/useNewsProviders";
import { Article } from "../utils/useNewsFeed";
import { getSupabaseAnonKey, getEdgeFunctionUrl, getRestUrl } from "../utils/supabase/config";
import { toast } from "sonner@2.0.3";
import { NewsDebugPanel } from "./NewsDebugPanel";
import { NewsAIInsights } from "./NewsAIInsights";
import { 
  Newspaper, Clock, RefreshCw, Loader2, ExternalLink, Rss, Database
} from "lucide-react";

interface NewsDashboardProps {
  onNavigateToFeeds?: () => void;
  onNavigateToProviders?: () => void;
}

type TimeFilter = 'today' | 'yesterday' | 'week' | 'month' | 'all';

export function NewsDashboard({ 
  onNavigateToFeeds,
  onNavigateToProviders
}: NewsDashboardProps) {
  // Filter states
  const [q, setQ] = useState<string>('');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');

  // Articles state
  const [articles, setArticles] = useState<Article[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Insights state
  const [showAIInsights, setShowAIInsights] = useState(false);

  // Load providers (enabled = true) - keep this for display
  const { providers, loading: loadingProviders } = useNewsProviders();

  // Fetch available providers from database (for filter dropdown)
  const [availableProviders, setAvailableProviders] = useState<Array<{
    id: string;
    name: string;
    type: string;
    is_active: boolean;
  }>>([]);

  useEffect(() => {
    const fetchProviders = async () => {
      try {
        const anonKey = getSupabaseAnonKey();
        const response = await fetch(
          getRestUrl('data_providers_public?select=id,name,type,is_active&category=eq.news'),
          {
            headers: {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            },
          }
        );

        if (response.ok) {
          const providerList = await response.json();
          setAvailableProviders(providerList);
        }
      } catch (err) {
        console.error('Failed to fetch providers for filter:', err);
      }
    };

    fetchProviders();
  }, []);

  // Fetch all articles on mount and when filters change
  useEffect(() => {
    fetchAllArticles();
  }, [selectedProvider, timeFilter]);

  // Fetch all articles from database
  const fetchAllArticles = async () => {
    console.log('🔄 [NEWS] Fetching all articles from database...');
    setLoadingArticles(true);
    setError(null);

    try {
      const url = new URL(getEdgeFunctionUrl('news_dashboard/news-articles/stored'));

      // Add filters as query parameters
      if (selectedProvider !== 'all') {
        url.searchParams.set('provider', selectedProvider);
      }

      // Add time filter
      const dateFilter = getDateFilter(timeFilter);
      if (dateFilter) {
        url.searchParams.set('from_date', dateFilter);
      }

      url.searchParams.set('limit', '1000');

      console.log('📡 [NEWS] Fetching from:', url.toString());

      const anonKey = getSupabaseAnonKey();
      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${anonKey}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ [NEWS] Fetch failed:', errorText);
        throw new Error(`Failed to fetch articles (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ [NEWS] Articles fetched:', data.articles?.length || 0);
      
      // Map API response to Article type
      const mappedArticles: Article[] = (data.articles ?? []).map((article: any) => ({
        id: article.id,
        title: article.title,
        description: article.description,
        content: article.content,
        url: article.url,
        imageUrl: article.image_url,
        publishedAt: article.published_at,
        source: article.source,
        author: article.author,
        provider: article.provider,
        country: article.country,
        language: article.language,
        createdAt: article.created_at,
      }));

      setArticles(mappedArticles);
      
      if (mappedArticles.length === 0) {
        toast.info('No articles found. Click "Refresh Live" to fetch from news APIs.');
      }
    } catch (err) {
      console.error('❌ [NEWS] Error:', err);
      setError(String(err));
      toast.error(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoadingArticles(false);
    }
  };

  // Get date filter based on time selection
  const getDateFilter = (filter: TimeFilter): string | null => {
    const now = new Date();
    let date: Date;

    switch (filter) {
      case 'today':
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return date.toISOString();
      case 'yesterday':
        date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        return date.toISOString();
      case 'week':
        date = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return date.toISOString();
      case 'month':
        date = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return date.toISOString();
      case 'all':
      default:
        return null;
    }
  };

  // Fetch new articles from live APIs
  const handleRefreshLive = async () => {
    console.log('🔄 [NEWS] Starting fetch articles...');
    setLoadingArticles(true);
    setError(null);
    
    try {
      // Step 1: Get active news providers from data_providers_public table
      console.log('📡 [NEWS] Fetching providers from data_providers_public...');
      
      const anonKey = getSupabaseAnonKey();
      const listResponse = await fetch(
        getRestUrl('data_providers_public?select=id,name,type,is_active&category=eq.news'),
        {
          headers: {
            Authorization: `Bearer ${anonKey}`,
            apikey: anonKey,
          },
        }
      );

      if (!listResponse.ok) {
        throw new Error(`Failed to fetch news providers: ${listResponse.status}`);
      }

      const newsProviders = await listResponse.json();
      console.log('✅ [NEWS] All news providers:', newsProviders);
      
      const activeProviders = newsProviders.filter((p: any) => p.is_active);
      console.log('✅ [NEWS] Active providers:', activeProviders);

      if (activeProviders.length === 0) {
        console.warn('⚠️ [NEWS] No active providers found');
        toast.warning('No active news providers found. Please configure providers in Data Feeds.');
        setArticles([]);
        setLoadingArticles(false);
        return;
      }

      // Step 2: Get provider details with credentials using RPC
      console.log('📡 [NEWS] Fetching provider credentials via RPC...');
      const providerDetailsPromises = activeProviders.map(async (provider: any) => {
        const rpcResponse = await fetch(
          getRestUrl('rpc/get_provider_details'),
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ p_id: provider.id }),
          }
        );

        if (!rpcResponse.ok) {
          console.error(`❌ [NEWS] RPC failed for ${provider.name}: ${rpcResponse.status}`);
          return null;
        }

        const details = await rpcResponse.json();
        return details && details.length > 0 ? details[0] : null;
      });

      const providerDetails = (await Promise.all(providerDetailsPromises)).filter(Boolean);
      console.log('✅ [NEWS] Provider details fetched:', providerDetails.length);

      if (providerDetails.length === 0) {
        console.warn('⚠️ [NEWS] No providers with valid credentials found');
        toast.warning('No configured news providers found. Please add API keys in Data Feeds.');
        setArticles([]);
        setLoadingArticles(false);
        return;
      }

      // Step 3: Format providers for edge function (map snake_case to camelCase)
      // Debug: log raw provider details to see what fields are available
      console.log('🔍 [NEWS] Raw provider details:', providerDetails.map((p: any) => ({
        name: p.name,
        type: p.type,
        has_api_key: !!p.api_key,
        has_config_api_key: !!p.config?.api_key,
        config_keys: p.config ? Object.keys(p.config) : [],
        all_keys: Object.keys(p)
      })));

      const formattedProviders = providerDetails.map((p: any) => ({
        name: p.name,
        type: p.type,
        apiKey: p.api_key || p.config?.api_key,
        country: p.config?.country,
        language: p.config?.language
      }));

      console.log('📡 [NEWS] Formatted providers:', formattedProviders.map(p => ({ name: p.name, type: p.type, hasKey: !!p.apiKey, keyLength: p.apiKey?.length })));

      // Step 4: Fetch articles from backend endpoint
      const url = getEdgeFunctionUrl('news_dashboard/news-articles');

      console.log('📡 [NEWS] Fetching articles from:', url);
      console.log('📡 [NEWS] Params:', { q, country: formattedProviders[0]?.country, language: formattedProviders[0]?.language });

      const articlesResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        },
        body: JSON.stringify({
          providers: formattedProviders,
          q,
          country: formattedProviders[0]?.country,
          language: formattedProviders[0]?.language,
          perProviderLimit: 10,
          totalLimit: 100
        })
      });

      console.log('📡 [NEWS] Articles response status:', articlesResponse.status);

      if (!articlesResponse.ok) {
        const errorText = await articlesResponse.text();
        console.error('❌ [NEWS] Articles fetch failed:', errorText);
        throw new Error(`Failed to fetch articles (${articlesResponse.status}): ${errorText}`);
      }

      const data = await articlesResponse.json();
      console.log('✅ [NEWS] Articles response data:', data);
      console.log('✅ [NEWS] Articles count:', data.articles?.length || 0);
      console.log('✅ [NEWS] First article sample:', data.articles?.[0]);
      
      // Map API response (snake_case) to Article type (camelCase)
      const mappedArticles: Article[] = (data.articles ?? []).map((article: any) => ({
        id: article.id,
        provider: article.provider,
        title: article.title,
        description: article.description,
        url: article.url,
        imageUrl: article.image_url,
        sourceName: article.source,
        publishedAt: article.published_at
      }));
      
      setArticles(mappedArticles);
      toast.success(`Fetched ${mappedArticles.length} new articles from ${activeProviders.length} provider(s)`);
      
      // Reload all articles from database to include the new ones
      await fetchAllArticles();
      
    } catch (err) {
      console.error('❌ [NEWS] Error fetching news:', err);
      setError(String(err));
      toast.error(err instanceof Error ? err.message : 'Failed to fetch articles');
    } finally {
      setLoadingArticles(false);
      console.log('🏁 [NEWS] Fetch complete');
    }
  };

  // Counts by provider for "Data Providers" widget
  const providerCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of articles) {
      map.set(a.provider, (map.get(a.provider) || 0) + 1);
    }
    return map;
  }, [articles]);

  // Filter articles by selected provider
  const filteredArticles = useMemo(() => {
    if (selectedProvider === 'all') {
      return articles;
    }
    return articles.filter(a => a.provider === selectedProvider);
  }, [articles, selectedProvider]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 mb-1 text-[24px]">
            <Newspaper className="w-6 h-6 text-orange-600" />
            News Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Monitor and manage news articles across multiple providers
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleRefreshLive}
            disabled={loadingArticles}
            className="gap-2"
          >
            {loadingArticles ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Fetching...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Refresh Live
              </>
            )}
          </Button>
          <NewsDebugPanel />
        </div>
      </div>

      {/* Summary Statistics (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Card className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-orange-500/10 group">
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-lg">
                <Newspaper className="w-6 h-6 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Articles</p>
                {loadingArticles ? (
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                ) : (
                  <p className="text-2xl font-semibold">{articles.length}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  {loadingArticles ? 'Loading...' : 'From all sources'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/10 group cursor-pointer hover:bg-muted/50"
        >
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-gray-100 dark:bg-gray-900/20 rounded-lg">
                <Database className="w-6 h-6 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Overrides</p>
                <p className="text-2xl font-semibold">0</p>
                <p className="text-xs text-muted-foreground">
                  No changes made
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <NewsAIInsights
          articles={filteredArticles}
          compact={true}
          onClick={() => setShowAIInsights(!showAIInsights)}
        />

        <Card 
          className={`h-full relative overflow-hidden transition-all duration-300 hover:shadow-2xl hover:shadow-purple-500/10 group ${onNavigateToFeeds ? "cursor-pointer hover:bg-muted/50" : ""}`}
          onClick={onNavigateToFeeds}
        >
          <CardContent className="p-6 relative">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-100 dark:bg-purple-900/20 rounded-lg">
                <Rss className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Data Providers</p>
                <p className="text-2xl font-semibold">
                  {availableProviders.filter(p => p.is_active).length}/{availableProviders.length}
                </p>
                <p className="text-xs text-muted-foreground">
                  {availableProviders.filter(p => p.is_active).length} active
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Section - Expanded View */}
      {showAIInsights && (
        <NewsAIInsights 
          articles={filteredArticles}
          listView={true}
        />
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
            <div className="lg:col-span-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search titles, content..."
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="provider">Provider</Label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger id="provider">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  {availableProviders.map(provider => {
                    const count = providerCounts.get(provider.type) || 0;
                    return (
                      <SelectItem key={provider.id} value={provider.type}>
                        {provider.name} ({count})
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="timeFilter">Time Filter</Label>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger id="timeFilter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">Last Week</SelectItem>
                  <SelectItem value="month">Last Month</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Articles List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Newspaper className="w-5 h-5" />
            Articles ({loadingArticles ? '...' : filteredArticles.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="p-4 mb-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg">
              <p className="text-sm">Error loading articles: {error}</p>
            </div>
          )}

          {loadingArticles ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="text-center py-12">
              <Newspaper className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="mb-2">No articles found</h3>
              <p className="text-sm text-muted-foreground">
                {selectedProvider !== 'all' 
                  ? `No articles from ${selectedProvider.toUpperCase()}. Try selecting a different provider.`
                  : 'Try adjusting your filters or check back later for new content.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="grid grid-cols-[160px_1fr] gap-4 p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/30 transition-all no-underline text-foreground relative overflow-hidden group"
                >
                  <div className="w-[160px] h-[100px] bg-muted rounded overflow-hidden relative">
                    {article.imageUrl ? (
                      <img
                        src={article.imageUrl}
                        alt=""
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Newspaper className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="relative">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="flex-1">{article.title}</h3>
                      <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                      <Badge variant="outline" className="text-xs">
                        {article.provider.toUpperCase()}
                      </Badge>
                      {article.sourceName && (
                        <span>{article.sourceName}</span>
                      )}
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{new Date(article.publishedAt).toLocaleString()}</span>
                    </div>
                    {article.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {article.description}
                      </p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}