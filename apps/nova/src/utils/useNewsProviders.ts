import { useEffect, useState } from 'react';
import { getRestUrl, getSupabaseAnonKey } from './supabase/config';

export type NewsProvider = {
  id: string;
  name: string;
  type: 'newsapi' | 'newsdata' | 'gnews' | 'currents' | string;
  apiKey?: string;
  api_key?: string;
  baseUrl?: string;
  base_url?: string;
  country?: string;
  language?: string;
  pageSize?: number;
  page_size?: number;
  isActive: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  updatedAt?: string;
  updated_at?: string;
};

export function useNewsProviders() {
  const [providers, setProviders] = useState<NewsProvider[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Fetch news providers from data_providers_public (same pattern as Finance/Weather)
        const anonKey = getSupabaseAnonKey();
        const response = await fetch(
          getRestUrl('data_providers_public?select=id,name,type,is_active&category=eq.news'),
          {
            headers: {
              Authorization: `Bearer ${anonKey}`,
              apikey: anonKey,
            }
          }
        );

        if (!mounted) return;
        
        if (!response.ok) {
          console.error('Failed to fetch news providers:', {
            status: response.status,
            statusText: response.statusText
          });
          
          setProviders([]);
          setLoading(false);
          return;
        }

        const data = await response.json();
        
        // Map snake_case to camelCase and filter active providers
        const mappedProviders = (data || []).map((p: any) => ({
          id: p.id,
          name: p.name,
          type: p.type,
          apiKey: p.api_key,
          api_key: p.api_key,
          baseUrl: p.base_url,
          base_url: p.base_url,
          country: p.country,
          language: p.language,
          pageSize: p.page_size,
          page_size: p.page_size,
          isActive: p.is_active ?? true,
          is_active: p.is_active,
          createdAt: p.created_at,
          created_at: p.created_at,
          updatedAt: p.updated_at,
          updated_at: p.updated_at
        }));
        
        setProviders(mappedProviders.filter((p: NewsProvider) => p.isActive || p.is_active));
        setLoading(false);
      } catch (error) {
        if (!mounted) return;
        console.error('Error fetching news providers:', error);
        setProviders([]);
        setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  return { providers, loading };
}