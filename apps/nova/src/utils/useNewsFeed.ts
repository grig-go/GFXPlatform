import { useEffect, useState, useMemo } from 'react';
import { getEdgeFunctionUrl, getSupabaseAnonKey } from './supabase/config';

export type Article = {
  id: string;
  provider: string; // 'newsapi' | 'newsdata' | ...
  title: string;
  description?: string;
  url: string;
  imageUrl?: string;
  sourceName?: string;
  publishedAt: string;
};

// news-feed is a separate Edge Function (not under make-server-cbef71cf)
const EDGE_BASE = getEdgeFunctionUrl('news-feed');

export function useNewsFeed(opts: {
  q?: string;
  country?: string;
  language?: string;
  perProviderLimit?: number; // e.g., 20
  totalLimit?: number;       // e.g., 100
}) {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const url = useMemo(() => {
    const u = new URL(EDGE_BASE);
    if (opts.perProviderLimit) u.searchParams.set('perProviderLimit', String(opts.perProviderLimit));
    if (opts.totalLimit) u.searchParams.set('totalLimit', String(opts.totalLimit));
    if (opts.q) u.searchParams.set('q', opts.q);
    if (opts.country) u.searchParams.set('country', opts.country);
    if (opts.language) u.searchParams.set('language', opts.language);
    // NOTE: no provider filter → Edge Function uses *all enabled* news providers
    return u.toString();
  }, [opts.perProviderLimit, opts.totalLimit, opts.q, opts.country, opts.language]);

  useEffect(() => {
    let abort = false;
    setLoading(true);
    setError(null);

    const anonKey = getSupabaseAnonKey();

    // Add required auth headers for Supabase Edge Functions
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
        'Cache-Control': 'no-cache'
      }
    })
      .then(r => {
        if (!r.ok) {
          throw new Error(`HTTP ${r.status}: ${r.statusText}`);
        }
        return r.json();
      })
      .then(d => { if (!abort) setArticles(d.articles ?? []); })
      .catch(e => { if (!abort) setError(String(e)); })
      .finally(() => { if (!abort) setLoading(false); });
    return () => { abort = true; };
  }, [url]);

  return { articles, loading, error };
}
