/**
 * API Configuration for Nova Dashboard
 *
 * Centralized configuration for all backend API endpoints.
 * Replace PROJECT_REF with your actual Supabase project reference.
 */

import { getSupabaseUrl } from './supabase/config';

// Base URL for Supabase Edge Functions
export const SUPABASE_FUNCTIONS_URL = `${getSupabaseUrl()}/functions/v1`;

// Main server endpoint (Hono backend)
export const API_BASE_URL = `${SUPABASE_FUNCTIONS_URL}/make-server-cbef71cf`;

// Separate edge functions (not part of make-server-cbef71cf)
export const NEWS_FEED_URL = `${SUPABASE_FUNCTIONS_URL}/news-feed`;

/**
 * API Endpoints
 * All endpoints are prefixed with /make-server-cbef71cf
 */
export const API_ENDPOINTS = {
  // Health & Debug
  health: `${API_BASE_URL}/health`,
  
  // AI Providers (Database-backed)
  aiProviders: `${API_BASE_URL}/ai-providers`,
  aiProvidersById: (id: string) => `${API_BASE_URL}/ai-providers/${id}`,
  aiProvidersReveal: (id: string) => `${API_BASE_URL}/ai-providers/${id}/reveal`,
  aiProvidersInitialize: `${API_BASE_URL}/ai-providers/initialize`,
  aiProvidersMigrate: `${API_BASE_URL}/ai-providers/migrate-from-kv`,
  aiProvidersFetchModels: `${API_BASE_URL}/ai-providers/fetch-models`,
  aiProvidersChat: `${API_BASE_URL}/ai-providers/chat`,
  
  // Weather Providers (KV Store)
  weatherProviders: `${API_BASE_URL}/weather-providers`,
  weatherProvidersById: (id: string) => `${API_BASE_URL}/weather-providers/${id}`,
  
  // Weather Locations (KV Store)
  weatherLocations: `${API_BASE_URL}/weather-locations`,
  weatherLocationsById: (id: string) => `${API_BASE_URL}/weather-locations/${id}`,
  
  // Weather Data (Fetch + Cache)
  weatherData: `${API_BASE_URL}/weather-data`,
  
  // News Providers (KV Store)
  newsProviders: `${API_BASE_URL}/news-providers`,
  newsProvidersById: (id: string) => `${API_BASE_URL}/news-providers/${id}`,
  
  // News Articles (KV Store)
  newsArticles: `${API_BASE_URL}/news-articles`,
  newsArticlesById: (id: string) => `${API_BASE_URL}/news-articles/${id}`,
  
  // News AI Insights (KV Store)
  newsAIInsights: `${API_BASE_URL}/news-ai-insights`,
  newsAIInsightsById: (id: string) => `${API_BASE_URL}/news-ai-insights/${id}`,
  
  // News Feed (Separate Edge Function)
  newsFeed: NEWS_FEED_URL,
  
  // Sports Providers (KV Store)
  sportsProviders: `${API_BASE_URL}/sports-providers`,
  sportsProvidersById: (id: string) => `${API_BASE_URL}/sports-providers/${id}`,
  
  // Sports Data (Provider-Agnostic)
  sportsTeams: `${API_BASE_URL}/sports/teams`,
  sportsStandings: `${API_BASE_URL}/sports/standings`,
  sportsSeasons: `${API_BASE_URL}/sports/seasons`,
  
  // Sports Data Management (KV Store)
  sportsAddLeague: `${API_BASE_URL}/sports/add-league`,
  sportsAddTeam: `${API_BASE_URL}/sports/add-team`,
  sportsTeamsList: `${API_BASE_URL}/sports-teams`,
  sportsTeamsById: (id: string) => `${API_BASE_URL}/sports-teams/${id}`,
  
  // Sports AI Insights (KV Store)
  sportsAIInsights: `${API_BASE_URL}/sports-ai-insights`,
  sportsAIInsightsById: (id: string) => `${API_BASE_URL}/sports-ai-insights/${id}`,
  
  // Sports Data Fetch
  sportsData: `${API_BASE_URL}/sports-data`,
  
  // Alpaca Stocks (Database)
  alpacaStocks: `${API_BASE_URL}/alpaca-stocks`,
  alpacaStocksFetch: `${API_BASE_URL}/alpaca-stocks/fetch`,
} as const;

/**
 * Get authorization headers for API requests
 * @deprecated Use getSupabaseHeaders from './supabase/config' instead
 */
export function getAuthHeaders(publicAnonKey: string) {
  return {
    'Authorization': `Bearer ${publicAnonKey}`,
    'apikey': publicAnonKey,
    'Content-Type': 'application/json',
  };
}

/**
 * Helper to check if backend is healthy
 */
export async function checkBackendHealth(publicAnonKey: string): Promise<{
  status: 'ok' | 'error';
  build?: string;
  error?: string;
}> {
  try {
    const response = await fetch(API_ENDPOINTS.health, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'apikey': publicAnonKey,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      return {
        status: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`,
      };
    }
    
    const data = await response.json();
    return {
      status: 'ok',
      build: data.build,
    };
  } catch (error) {
    return {
      status: 'error',
      error: error instanceof Error ? error.message : String(error),
    };
  }
}